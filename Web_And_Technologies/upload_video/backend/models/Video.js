const mongoose = require('mongoose'); // Import thư viện mongoose để làm việc với MongoDB

// Khởi tạo một Schema mới cho collection Video
const videoSchema = new mongoose.Schema({
  // Trường lưu tên file gốc của video
  filename: { type: String, required: true },
  
  // Trường lưu đường dẫn hoặc key của video trên Cloudflare R2
  fileKey: { type: String, required: true },
  
  // Trường lưu trạng thái xử lý của video (uploading, processing, completed, failed)
  status: { type: String, default: 'uploading' },
  
  // Trường lưu dung lượng của file video tính bằng bytes
  size: { type: Number },
  
  // Trường lưu đường dẫn đến ảnh thumbnail sau khi worker xử lý xong
  thumbnailUrl: { type: String },
  
  // Trường lưu đường dẫn URL có thể truy cập public của video sau khi hoàn thành
  videoUrl: { type: String },
  
  // Trường lưu thời gian tạo bản ghi, mặc định là thời điểm hiện tại
  createdAt: { type: Date, default: Date.now }
});

// Biên dịch Schema thành Model và export để sử dụng ở các file khác
module.exports = mongoose.model('Video', videoSchema);
