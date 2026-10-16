// Khai báo các thư viện cần thiết
const express = require('express'); // Framework web để tạo API server
const cors = require('cors'); // Middleware để cho phép gọi API từ domain khác (Cross-Origin)
const { createServer } = require('http'); // Module http tích hợp sẵn của Node.js để tạo server
const { Server } = require('socket.io'); // Thư viện Socket.IO để kết nối realtime (WebSockets)
const { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require('@aws-sdk/client-s3'); // Các lệnh từ AWS SDK S3 để làm việc với Cloudflare R2
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner'); // Hàm sinh ra URL ký sẵn (Presigned URL)
const { Queue } = require('bullmq'); // Thư viện Queue để đẩy job cho worker xử lý
const mongoose = require('mongoose'); // Thư viện kết nối MongoDB
require('dotenv').config({ path: '../.env' }); // Nạp các biến môi trường từ file .env ở thư mục gốc (hoặc require('dotenv').config() nếu chạy ở thư mục gốc)
// Để đảm bảo đọc được file .env ở thư mục gốc bất kể chạy script từ đâu, dùng path tuyệt đối hoặc process.cwd()
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') }); 

const Video = require('./models/Video'); // Nạp model Video đã định nghĩa

// Khởi tạo Express app
const app = express(); 
// Bật middleware xử lý dữ liệu JSON trong body của request
app.use(express.json()); 
// Cho phép tất cả các nguồn (origins) truy cập API
app.use(cors()); 

// Bọc Express app bằng HTTP server chuẩn của Node
const httpServer = createServer(app); 
// Khởi tạo Socket.IO server đính kèm vào HTTP server, cho phép cross-origin
const io = new Server(httpServer, { cors: { origin: '*' } }); 

// Lấy thông tin xác thực từ file .env
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID; // ID tài khoản Cloudflare R2
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID; // Key ID của R2
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY; // Secret Key của R2
const BUCKET_NAME = process.env.R2_BUCKET_NAME; // Tên bucket trên R2

// Khởi tạo đối tượng S3 Client kết nối tới Cloudflare R2
const s3Client = new S3Client({
  region: 'auto', // R2 luôn dùng region là 'auto'
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, // URL kết nối đặc thù của R2 theo Account ID
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID, // Truyền Access Key
    secretAccessKey: R2_SECRET_ACCESS_KEY, // Truyền Secret Key
  },
});

// Khởi tạo hàng đợi BullMQ tên là 'video-processing', trỏ tới Redis đang chạy ở localhost
const videoQueue = new Queue('video-processing', { connection: { host: 'localhost', port: 6379 } });

// Lắng nghe kết nối WebSocket mới từ client
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`); // In log khi có client kết nối
  // Lắng nghe sự kiện disconnect khi client ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`); 
  });
});

// --- API 1: Bắt đầu quá trình upload ---
app.post('/api/upload/start', async (req, res) => {
  try {
    const { filename, contentType, size } = req.body; // Lấy thông tin file từ request body
    const fileKey = `${Date.now()}-${filename}`; // Tạo tên file duy nhất trên R2 bằng cách gắn thêm timestamp

    // Tạo lệnh yêu cầu khởi tạo Multipart Upload trên R2
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME, // Tên bucket
      Key: fileKey, // Tên file trên bucket
      ContentType: contentType, // Loại định dạng file (ví dụ: video/mp4)
    });
    
    // Gửi lệnh lên R2 và nhận về thông tin kết quả
    const response = await s3Client.send(command);
    const uploadId = response.UploadId; // Lấy UploadId duy nhất đại diện cho phiên upload này

    // Lưu một bản ghi mới vào MongoDB với trạng thái 'uploading'
    const newVideo = new Video({
      filename: filename,
      fileKey: fileKey,
      size: size,
      status: 'uploading'
    });
    await newVideo.save(); // Lưu vào DB

    // Trả về cho client UploadId, fileKey và ID của bản ghi trong database
    res.json({ uploadId, fileKey, videoId: newVideo._id });
  } catch (error) {
    console.error(error); // In lỗi ra console nếu có
    res.status(500).json({ error: 'Failed to start upload' }); // Trả về mã lỗi 500
  }
});

// --- API 2: Lấy Presigned URL cho từng phần (chunk) ---
app.post('/api/upload/presign', async (req, res) => {
  try {
    const { fileKey, uploadId, partNumber } = req.body; // Lấy fileKey, UploadId và số thứ tự phần (chunk) từ client

    // Tạo lệnh định nghĩa yêu cầu Upload một phần (UploadPart)
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME, // Tên bucket
      Key: fileKey, // Tên file
      UploadId: uploadId, // Truyền ID của phiên upload
      PartNumber: partNumber, // Truyền số thứ tự của chunk hiện tại (1, 2, 3...)
    });

    // Tạo URL ký sẵn (Presigned URL) có hạn sử dụng 1 tiếng (3600 giây)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Trả về URL ký sẵn cho client để client tự upload trực tiếp lên R2
    res.json({ presignedUrl });
  } catch (error) {
    console.error(error); // In lỗi nếu có
    res.status(500).json({ error: 'Failed to get presigned URL' }); // Báo lỗi cho client
  }
});

// --- API 3: Hoàn tất quá trình upload sau khi đã up xong tất cả các phần ---
app.post('/api/upload/complete', async (req, res) => {
  try {
    const { fileKey, uploadId, parts, videoId } = req.body; // Client gửi lên danh sách các phần (ETag và PartNumber) đã up xong

    // Sắp xếp lại danh sách các phần theo đúng số thứ tự tăng dần (PartNumber), rất quan trọng để S3 ghép đúng file
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

    // Tạo lệnh hoàn tất Multipart Upload
    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME, // Tên bucket
      Key: fileKey, // Tên file
      UploadId: uploadId, // ID phiên upload
      MultipartUpload: {
        Parts: sortedParts, // Truyền danh sách các phần đã sắp xếp
      },
    });

    // Gửi lệnh lên R2 để bắt đầu ghép các chunk thành file video hoàn chỉnh
    await s3Client.send(command);

    // Cập nhật trạng thái của video trong cơ sở dữ liệu MongoDB thành 'processing' (Đang xử lý ngầm)
    const video = await Video.findByIdAndUpdate(videoId, { status: 'processing' }, { new: true });

    // Đẩy một Job vào hàng đợi BullMQ để worker bắt đầu xử lý FFmpeg (Lưu ý: Không đợi worker làm xong ở đây!)
    await videoQueue.add('process-video', {
      videoId: videoId, // Truyền ID video vào job để worker biết cần xử lý file nào
      fileKey: fileKey, // Truyền Key của file
      bucket: BUCKET_NAME // Truyền tên bucket
    });

    // Thông báo realtime cho toàn bộ client qua WebSocket rằng quá trình upload lên R2 đã xong
    io.emit('upload_completed', { videoId, fileKey, message: 'Upload thành công! Đang tiến hành xử lý FFmpeg...' });

    // Trả về kết quả thành công ngay lập tức cho API call
    res.json({ message: 'Upload complete, processing started', video });
  } catch (error) {
    console.error(error); // In log lỗi
    res.status(500).json({ error: 'Failed to complete upload' }); // Trả về mã lỗi HTTP 500
  }
});

mongoose.connect('mongodb://localhost:27017/video_db')
  .then(() => {
    console.log('[MongoDB] Connected to database'); // Báo kết nối thành công
    // Chỉ khởi động server Express & Socket.IO khi đã kết nối DB thành công
    httpServer.listen(3000, () => {
      console.log('[Server] API Server is running on http://localhost:3000'); // Log báo server chạy ở port 3000
    });
  })
  .catch(err => console.error('[MongoDB] Connection error:', err)); // Xử lý lỗi nếu kết nối MongoDB thất bại
