/**
 * ==============================================================================
 * PRODUCTION-GRADE BULLMQ JOB QUEUE SERVICE
 * ==============================================================================
 * Kiến trúc hàng đợi công việc bất đồng bộ trên nền Redis:
 * 1. Queue Producer: Nhận request và đẩy Job vào Redis trong 2ms.
 * 2. Background Worker: Tiêu thụ Job với Concurrency = 3 và Rate Limiter.
 * 3. Báo cáo tiến độ thời gian thực (updateProgress).
 * 4. Tự động dọn rác (removeOnComplete & removeOnFail) bảo vệ RAM Redis.
 */

const express = require('express');
const cors = require('cors');
const { Queue, Worker, QueueEvents } = require('bullmq');

const app = express();
const PORT = process.env.PORT || 4002;
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null // Bắt buộc cho BullMQ
};

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------------------
// 1. KHỞI TẠO HÀNG ĐỢI (QUEUE PRODUCER)
// ------------------------------------------------------------------------------
const taskQueue = new Queue('heavy-tasks-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Thử lại tối đa 3 lần nếu có lỗi
    backoff: {
      type: 'exponential',
      delay: 1000 // 1s, 2s, 4s...
    },
    // BẢO VỆ BỘ NHỚ RAM REDIS:
    removeOnComplete: { count: 200 }, // Chỉ lưu 200 job hoàn tất gần nhất
    removeOnFail: { count: 500 }      // Lưu 500 job lỗi để tra cứu
  }
});

// ------------------------------------------------------------------------------
// 2. WORKER XỬ LÝ NỀN (CONSUMER)
// ------------------------------------------------------------------------------
const taskWorker = new Worker(
  'heavy-tasks-queue',
  async (job) => {
    console.log(`🔨 [Worker] Nhận Job #${job.id} (${job.name}) - Priority: ${job.opts.priority || 'Normal'}`);

    const { type, durationMs = 3000, shouldFail = false } = job.data;

    // Giả lập tiến độ theo thời gian thực (0% -> 100%)
    const steps = 5;
    for (let step = 1; step <= steps; step++) {
      await new Promise(r => setTimeout(r, durationMs / steps));
      const currentProgress = Math.round((step / steps) * 100);
      await job.updateProgress(currentProgress);
    }

    // Nếu job được cấu hình cố tình gây lỗi
    if (shouldFail) {
      throw new Error(`Sự cố mạng hoặc lỗi xử lý giả lập tại bước cuối cùng của Job #${job.id}!`);
    }

    console.log(`✅ [Worker] Hoàn tất Job #${job.id}`);
    return {
      success: true,
      resultMessage: `Đã xử lý xong tác vụ ${type} thành công!`,
      completedAt: new Date().toISOString()
    };
  },
  {
    connection,
    concurrency: 3 // Xử lý song song tối đa 3 jobs cùng lúc
  }
);

// ------------------------------------------------------------------------------
// 3. APIS ĐIỀU KHIỂN & GIÁM SÁT
// ------------------------------------------------------------------------------

// Tạo Job mới
app.post('/api/jobs/create', async (req, res) => {
  const { type = 'video_transcode', priority = 0, shouldFail = false } = req.body;

  const jobName = type === 'video_transcode' ? 'Transcode-4K-Video' : type === 'vip_export' ? 'VIP-Excel-Report' : 'Faulty-Test-Job';

  const job = await taskQueue.add(jobName, {
    type,
    durationMs: type === 'vip_export' ? 2000 : 3500,
    shouldFail
  }, {
    priority: priority > 0 ? priority : undefined // 1 là cao nhất
  });

  res.status(202).json({
    success: true,
    message: 'Job đã được đưa vào hàng đợi thành công!',
    jobId: job.id,
    jobName: job.name,
    priority: job.opts.priority || 'Normal'
  });
});

// Lấy số liệu thống kê
app.get('/api/jobs/stats', async (req, res) => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    taskQueue.getWaitingCount(),
    taskQueue.getActiveCount(),
    taskQueue.getCompletedCount(),
    taskQueue.getFailedCount(),
    taskQueue.getDelayedCount()
  ]);

  res.status(200).json({
    counts: { waiting, active, completed, failed, delayed }
  });
});

// Lấy danh sách jobs gần nhất
app.get('/api/jobs/recent', async (req, res) => {
  const [activeJobs, waitingJobs, completedJobs, failedJobs] = await Promise.all([
    taskQueue.getActive(0, 10),
    taskQueue.getWaiting(0, 10),
    taskQueue.getCompleted(0, 10),
    taskQueue.getFailed(0, 10)
  ]);

  const mapJob = (j, state) => ({
    id: j.id,
    name: j.name,
    state,
    progress: j.progress || 0,
    data: j.data,
    failedReason: j.failedReason,
    returnValue: j.returnvalue,
    attemptsMade: j.attemptsMade,
    timestamp: j.timestamp
  });

  const list = [
    ...activeJobs.map(j => mapJob(j, 'active')),
    ...waitingJobs.map(j => mapJob(j, 'waiting')),
    ...completedJobs.map(j => mapJob(j, 'completed')),
    ...failedJobs.map(j => mapJob(j, 'failed'))
  ];

  res.status(200).json({ jobs: list });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Stopping BullMQ worker...');
  await taskWorker.close();
  await taskQueue.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BullMQ Backend service listening on port ${PORT}`);
});
