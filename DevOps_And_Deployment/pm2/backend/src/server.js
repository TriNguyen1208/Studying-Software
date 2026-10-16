/**
 * ==============================================================================
 * PRODUCTION-GRADE NODE.JS CLUSTER WORKER APPLICATION (PM2 DEEP DIVE)
 * ==============================================================================
 * Ứng dụng này được thiết kế để chạy dưới sự điều phối của PM2 Cluster Mode.
 * Tích hợp sẵn cơ chế phát tín hiệu sẵn sàng (ready signal), xử lý tắt êm ái
 * (Graceful Shutdown) và các API mô phỏng Chaos Engineering.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// PM2 tự động gán biến môi trường NODE_APP_INSTANCE cho từng worker (0, 1, 2, 3...)
const WORKER_INSTANCE_ID = process.env.NODE_APP_INSTANCE !== undefined 
  ? `Worker #${process.env.NODE_APP_INSTANCE}` 
  : `Worker-PID-${process.pid}`;

let requestCount = 0;
const bootTimestamp = Date.now();

// Vùng nhớ toàn cục dùng để giả lập rò rỉ bộ nhớ (Memory Leak Chaos Simulation)
global.__leakedDataStore = global.__leakedDataStore || [];

// Middleware
app.use(cors());
app.use(express.json());

// Gắn thông tin định danh Worker vào mọi HTTP response
app.use((req, res, next) => {
  requestCount++;
  res.setHeader('X-Served-By-Worker', WORKER_INSTANCE_ID);
  res.setHeader('X-Worker-PID', process.pid);
  next();
});

// ------------------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------------------

/**
 * 1. CLUSTER STATUS ENDPOINT
 * Đoạn này làm gì?
 * - Trả về thông tin chi tiết của worker hiện tại đang xử lý request (PID, RAM RSS, Uptime, Request count).
 * Tại sao cần trong production?
 * - Giúp hệ thống giám sát (Monitoring/APM) và Frontend Console theo dõi tình trạng từng worker.
 */
app.get('/api/cluster/status', (req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    status: 'ONLINE',
    workerId: WORKER_INSTANCE_ID,
    pid: process.pid,
    uptimeSeconds: Math.floor((Date.now() - bootTimestamp) / 1000),
    totalRequestsHandled: requestCount,
    memory: {
      rssMb: (mem.rss / 1024 / 1024).toFixed(2),
      heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      leakedChunksCount: global.__leakedDataStore.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 2. LIGHTWEIGHT PING (DÙNG ĐỂ BENCHMARK RELOAD TRAFFIC)
 * Đoạn này làm gì?
 * - Phản hồi ngay tức thì để Frontend bắn dồn dập 100 requests trong lúc PM2 reload.
 */
app.get('/api/ping', (req, res) => {
  res.status(200).json({
    message: 'PONG',
    workerId: WORKER_INSTANCE_ID,
    pid: process.pid,
    timestamp: Date.now()
  });
});

/**
 * 3. CHAOS SIMULATION: UNHANDLED CRASH TEST
 * Đoạn này làm gì?
 * - Cố tình phát sinh lỗi nghiêm trọng không được bắt (Unhandled Exception).
 * Tại sao cần thử nghiệm điều này?
 * - Chứng minh trong môi trường production có PM2: Khi 1 worker gặp lỗi nghiêm trọng,
 *   PM2 God Daemon sẽ lập tức hồi sinh worker đó với PID mới trong < 300ms,
 *   trong khi các worker khác trong cụm vẫn phục vụ bình thường!
 */
app.post('/api/chaos/crash', (req, res) => {
  const victimPid = process.pid;
  const victimWorker = WORKER_INSTANCE_ID;

  // Gửi phản hồi trước cho client
  res.status(200).json({
    message: `Đang kích hoạt sự cố Unhandled Exception trên ${victimWorker} (PID: ${victimPid})!`,
    victimWorker,
    victimPid,
    instruction: 'Hãy quan sát xem PM2 tự động hồi sinh worker này với PID mới như thế nào!'
  });

  // Kích hoạt lỗi chết người bất đồng bộ sau 100ms
  setTimeout(() => {
    console.error(`💥 [CHAOS] Worker ${victimWorker} (PID: ${victimPid}) gặp sự cố nghiêm trọng!`);
    throw new Error(`CRITICAL FAILURE: Fatal Uncaught Exception in ${victimWorker}!`);
  }, 100);
});

/**
 * 4. CHAOS SIMULATION: MEMORY LEAK INJECTION
 * Đoạn này làm gì?
 * - Bơm ~25MB dữ liệu rác vào biến toàn cục không bao giờ được Garbage Collector dọn dẹp.
 * Tại sao cần thử nghiệm điều này?
 * - Kiểm chứng cấu hình `max_memory_restart: '120M'` trong `ecosystem.config.js`.
 *   Khi RAM vượt ngưỡng 120MB, PM2 sẽ chủ động restart worker một cách an toàn
 *   tránh lỗi sập toàn bộ máy chủ vì Out of Memory (OOM).
 */
app.post('/api/chaos/leak', (req, res) => {
  // Tạo buffer rác 25MB và lưu vào mảng toàn cục
  const chunkSizeMb = 25;
  const junkBuffer = Buffer.alloc(chunkSizeMb * 1024 * 1024, 'X');
  global.__leakedDataStore.push(junkBuffer);

  const mem = process.memoryUsage();
  const currentRssMb = (mem.rss / 1024 / 1024).toFixed(2);

  res.status(200).json({
    message: `Đã bơm thành công ${chunkSizeMb}MB rác vào RAM của ${WORKER_INSTANCE_ID}!`,
    workerId: WORKER_INSTANCE_ID,
    pid: process.pid,
    currentRssMb: `${currentRssMb} MB`,
    maxMemoryThreshold: '120 MB',
    totalLeakedChunks: global.__leakedDataStore.length,
    willRestartSoon: parseFloat(currentRssMb) > 120
  });
});

/**
 * 5. CHAOS SIMULATION: HEAVY CPU CALCULATION
 * Đoạn này làm gì?
 * - Chạy vòng lặp tính toán nặng làm khóa Event Loop của worker này trong 2 giây.
 * Tại sao cần thử nghiệm?
 * - Chứng minh Node.js Cluster Module sẽ tự động điều phối các request tiếp theo
 *   sang các worker rảnh rỗi khác mà không làm đơ toàn bộ website.
 */
app.get('/api/chaos/heavy-cpu', (req, res) => {
  const start = Date.now();
  // Giả lập tính toán mã hóa hoặc xử lý ảnh nặng
  let counter = 0;
  for (let i = 0; i < 2e8; i++) {
    counter += i % 7;
  }
  const duration = Date.now() - start;

  res.status(200).json({
    message: 'Hoàn tất phép tính nặng CPU!',
    workerId: WORKER_INSTANCE_ID,
    pid: process.pid,
    calculationDurationMs: duration
  });
});

// ------------------------------------------------------------------------------
// KHỞI ĐỘNG VÀ BẮT TAY VỚI PM2 (ZERO-DOWNTIME HANDSHAKE)
// ------------------------------------------------------------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [${WORKER_INSTANCE_ID}] Node process (PID: ${process.pid}) đang lắng nghe tại cổng ${PORT}`);

  /**
   * CỰC KỲ QUAN TRỌNG TRONG PRODUCTION:
   * Khi ecosystem.config.js cấu hình `wait_ready: true`, PM2 sẽ KHÔNG coi worker này là sẵn sàng
   * cho đến khi nhận được tín hiệu 'ready'.
   * Điều này đảm bảo toàn bộ logic kết nối DB, nạp cache hoàn tất 100% trước khi Nginx/Client
   * được phép gửi request vào!
   */
  if (process.send) {
    console.log(`📡 [${WORKER_INSTANCE_ID}] Gửi tín hiệu 'ready' tới PM2 God Daemon...`);
    process.send('ready');
  }
});

/**
 * CƠ CHẾ GRACEFUL SHUTDOWN KHI PM2 GỬI TÍN HIỆU DỪNG
 * Tại sao cần?
 * - Khi thực hiện `pm2 reload`, PM2 gửi tín hiệu SIGINT cho worker cũ.
 * - Worker cũ phải:
 *   1. Ngừng nhận request mới (server.close()).
 *   2. Đợi tất cả request đang xử lý dở dang (In-flight requests) hoàn tất.
 *   3. Giải phóng DB pool / Redis connection.
 *   4. Thoát an toàn với process.exit(0).
 */
const handleGracefulShutdown = () => {
  console.log(`⚠️ [${WORKER_INSTANCE_ID}] (PID: ${process.pid}) Nhận tín hiệu SIGINT từ PM2. Bắt đầu Graceful Shutdown...`);

  server.close(() => {
    console.log(`✅ [${WORKER_INSTANCE_ID}] Đã xử lý xong toàn bộ request đang dở dang. Thoát tiến trình an toàn.`);
    process.exit(0);
  });

  // Timeout dự phòng: Buộc thoát sau 8s nếu có request bị kẹt
  setTimeout(() => {
    console.error(`❌ [${WORKER_INSTANCE_ID}] Timeout 8s khi dọn dẹp! Buộc cưỡng chế thoát.`);
    process.exit(1);
  }, 8000);
};

process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);
