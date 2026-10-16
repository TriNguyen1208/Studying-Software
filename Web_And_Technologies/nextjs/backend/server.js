/**
 * server.js - Điểm khởi động chính của Backend Node.js
 * 
 * Các tính năng chuẩn Production:
 * - CORS cấu hình cho phép Next.js Frontend truy cập
 * - Rate Limiting bảo vệ tài nguyên
 * - Morgan ghi log truy vấn HTTP
 * - Global Error Handler
 * - Graceful Shutdown xử lý khi server bị tắt
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;

// 1. Middleware cơ bản
app.use(cors({
  origin: '*', // Trong môi trường production sẽ giới hạn theo domain frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev')); // Log format ngắn gọn thân thiện

// 2. Bảo vệ API bằng Rate Limiter
app.use('/api', rateLimiter);

// 3. Đăng ký API Routes
app.use('/api', apiRoutes);

// 4. Xử lý Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy tài nguyên: ${req.method} ${req.originalUrl}`
  });
});

// 5. Middleware xử lý lỗi toàn cục (phải đặt sau tất cả các route)
app.use(errorHandler);

// 6. Khởi động Server
const server = app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Node.js Backend API đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 SSE Event Stream: http://localhost:${PORT}/api/events`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Catalog Products: http://localhost:${PORT}/api/products`);
  console.log(`===================================================`);
});

// 7. Graceful Shutdown (Dừng server an toàn)
// Lắng nghe tín hiệu SIGINT (Ctrl+C) hoặc SIGTERM (từ Docker/K8s)
const gracefulShutdown = (signal) => {
  console.log(`\nNhận tín hiệu ${signal}. Đang đóng HTTP Server an toàn...`);
  server.close(() => {
    console.log('HTTP Server đã đóng hoàn toàn. Không còn kết nối nào bị đứt gãy.');
    process.exit(0);
  });

  // Ép buộc dừng sau 10 giây nếu các kết nối vẫn bị treo
  setTimeout(() => {
    console.error('Không thể đóng kết nối trong 10 giây, ép buộc tắt tiến trình!');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
