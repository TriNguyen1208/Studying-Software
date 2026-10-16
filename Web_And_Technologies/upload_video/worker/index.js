const { Worker } = require('bullmq'); // Nạp class Worker từ thư viện BullMQ để xử lý hàng đợi
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3'); // Thư viện AWS SDK S3
const ffmpeg = require('fluent-ffmpeg'); // Thư viện bọc FFmpeg để xử lý video dễ dàng hơn bằng JS
const fs = require('fs'); // Module làm việc với hệ thống file của Node.js
const path = require('path'); // Module xử lý đường dẫn file
const mongoose = require('mongoose'); // Module Mongoose để tương tác với MongoDB
const { pipeline } = require('stream/promises'); // Hàm pipeline dùng để download/upload file dạng luồng (stream)
// Load biến môi trường từ file .env ở thư mục gốc của dự án
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') }); 

const Video = require('../backend/models/Video'); // Nạp model Video từ thư mục backend

// Lấy thông tin cấu hình Cloudflare R2 từ biến môi trường
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // URL public để truy cập file sau khi upload

// Khởi tạo S3 Client cho Worker (tương tự như bên Server)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Kết nối Worker tới MongoDB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/video_db';
mongoose.connect(MONGO_URL)
  .then(() => console.log('[Worker] Connected to MongoDB')) // Báo kết nối thành công
  .catch(err => console.error('[Worker] MongoDB Connection error:', err)); // Xử lý lỗi nếu có

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

// Khởi tạo Worker, liên kết với queue tên 'video-processing'
const worker = new Worker('video-processing', async (job) => {
  const { videoId, fileKey, bucket } = job.data; // Lấy dữ liệu được backend đẩy vào job
  console.log(`[Worker] Bắt đầu xử lý Job ${job.id} cho video: ${fileKey}`);

  // Tạo các đường dẫn file tạm thời (temp file) trên máy local để xử lý
  const inputTempPath = path.join(__dirname, `input_${fileKey}`); // File video gốc tải về
  const outputTempPath = path.join(__dirname, `output_${fileKey}`); // File video sau khi xử lý FastStart
  const thumbnailPath = path.join(__dirname, `thumb_${fileKey}.jpg`); // File ảnh thumbnail

  try {
    // --- BƯỚC 1: Tải video gốc từ Cloudflare R2 về ổ cứng local của Worker ---
    console.log(`[Worker] Đang tải video từ R2 về local...`);
    // Lệnh yêu cầu lấy file từ R2
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: fileKey });
    const { Body } = await s3Client.send(getCommand); // Thực thi lệnh
    // Lưu luồng dữ liệu (stream) nhận được từ R2 vào file trên ổ cứng local
    await pipeline(Body, fs.createWriteStream(inputTempPath)); 

    // --- BƯỚC 2: Dùng FFprobe để lấy thông tin metadata (độ phân giải, thời lượng...) ---
    console.log(`[Worker] Đang phân tích metadata (FFprobe)...`);
    const metadata = await new Promise((resolve, reject) => {
      // ffmpeg.ffprobe sẽ gọi command line ffprobe của hệ thống
      ffmpeg.ffprobe(inputTempPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata); // Trả về toàn bộ thông tin chi tiết của video
      });
    });
    // Lấy thời lượng video (tính bằng giây) từ metadata
    const duration = metadata.format.duration;
    console.log(`[Worker] Video duration: ${duration}s`);

    // --- BƯỚC 3: Tạo ảnh Thumbnail ---
    console.log(`[Worker] Đang tạo Thumbnail...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputTempPath)
        .on('end', () => resolve()) // Bắn sự kiện resolve khi hoàn thành
        .on('error', (err) => reject(err)) // Bắn sự kiện reject nếu lỗi
        .screenshots({
          count: 1, // Lấy 1 ảnh duy nhất
          folder: __dirname, // Thư mục lưu
          filename: path.basename(thumbnailPath), // Tên file thumbnail
          size: '1280x720' // Độ phân giải ảnh thumbnail (hoặc có thể để '?' để tự động theo tỷ lệ)
        });
    });

    // --- BƯỚC 4: Chạy lệnh chuyển đổi MP4 FastStart ---
    // FastStart đưa 'moov atom' (siêu dữ liệu về vị trí các khung hình) từ cuối file lên đầu file.
    // Việc này giúp video có thể bắt đầu phát ngay lập tức trên trình duyệt dù chưa tải xong, 
    // và cho phép trình duyệt tua (seek) tự do (HTTP Range Request) ngay lập tức.
    console.log(`[Worker] Đang xử lý MP4 FastStart...`);
    await new Promise((resolve, reject) => {
      ffmpeg(inputTempPath)
        .outputOptions([
          '-c copy', // Copy toàn bộ codec video/audio gốc, KHÔNG NÉN LẠI (tốc độ cực nhanh, giữ nguyên chất lượng)
          '-movflags faststart' // Cờ quan trọng nhất: Chuyển moov atom lên đầu file
        ])
        .output(outputTempPath) // Xuất ra file temp mới
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run(); // Bắt đầu chạy
    });

    // --- BƯỚC 5: Upload Thumbnail và Video đã xử lý lên lại R2 ---
    console.log(`[Worker] Đang upload kết quả lên R2...`);
    
    // Đọc nội dung 2 file mới tạo ra thành buffer
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const videoBuffer = fs.readFileSync(outputTempPath);

    // Tên (key) mới cho các file trên bucket
    const r2ThumbnailKey = `thumbnails/thumb_${fileKey}.jpg`;
    const r2VideoKey = `processed/faststart_${fileKey}`;

    // Upload Thumbnail lên R2
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: r2ThumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg'
    }));

    // Upload Video (đã có faststart) lên R2
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: r2VideoKey,
      Body: videoBuffer,
      ContentType: 'video/mp4' // Đặt đúng định dạng trả về để trình duyệt hiểu
    }));

    // --- BƯỚC 6: Cập nhật CSDL và kết thúc ---
    console.log(`[Worker] Hoàn thành upload. Đang cập nhật Database...`);
    
    // Sinh URL public để truy cập (dùng R2_PUBLIC_URL kết hợp với Key)
    const publicVideoUrl = `${R2_PUBLIC_URL}/${r2VideoKey}`;
    const publicThumbnailUrl = `${R2_PUBLIC_URL}/${r2ThumbnailKey}`;

    // Cập nhật record trong MongoDB thành 'completed' kèm theo URL mới
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      videoUrl: publicVideoUrl,
      thumbnailUrl: publicThumbnailUrl
    });

    console.log(`[Worker] Xử lý thành công Video: ${fileKey}`);
  } catch (error) {
    console.error(`[Worker] Lỗi xử lý video: ${fileKey}`, error);
    // Nếu lỗi, cập nhật DB thành 'failed'
    await Video.findByIdAndUpdate(videoId, { status: 'failed' });
    throw error; // Bắn ra lỗi để BullMQ biết job này thất bại và có thể tự động retry
  } finally {
    // LUÔN LUÔN Dọn dẹp các file rác (temp files) trên ổ cứng local để tránh đầy bộ nhớ
    if (fs.existsSync(inputTempPath)) fs.unlinkSync(inputTempPath);
    if (fs.existsSync(outputTempPath)) fs.unlinkSync(outputTempPath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
  }
}, { connection: { host: REDIS_HOST, port: 6379 } }); // Chỉ định kết nối tới Redis

// Lắng nghe sự kiện job thất bại để log ra màn hình
worker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job.id} bị lỗi: ${err.message}`);
});
