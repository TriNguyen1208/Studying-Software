/**
 * errorHandler.js - Bộ xử lý lỗi tập trung toàn cục (Global Error Handling)
 * 
 * Bản chất kiến trúc:
 * - Trong Express.js, middleware có 4 tham số (err, req, res, next) là Error-handling Middleware.
 * - Tránh việc lộ Stack Trace nhạy cảm của hệ thống ra ngoài môi trường Production.
 */

function errorHandler(err, req, res, next) {
  console.error(`[BACKEND ERROR] ${req.method} ${req.url}:`, err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  res.status(statusCode).json({
    success: false,
    error: err.name || "InternalServerError",
    message: err.message || "Đã xảy ra lỗi không mong muốn trên máy chủ.",
    ...(isProduction ? {} : { stack: err.stack })
  });
}

module.exports = errorHandler;
