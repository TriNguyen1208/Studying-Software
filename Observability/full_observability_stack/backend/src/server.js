/**
 * ============================================================================
 * OBSERVABILITY BACKEND SERVER (EXPRESS + PROMETHEUS + LOKI + JAEGER)
 * ============================================================================
 * Đoạn này làm gì?
 * - Điểm vào (Entry point) chính của dịch vụ Backend.
 * - QUAN TRỌNG: Phải import `./tracer` ngay dòng ĐẦU TIÊN trước mọi module khác,
 *   để OpenTelemetry kịp monkey-patch các module http, https, express của Node.js.
 * - Cung cấp endpoint `/metrics` định dạng chuẩn Prometheus Text Format.
 * - Bắt và ghi nhận mọi request vào Prometheus Metrics và Loki Structured Logs.
 * - Xử lý lỗi toàn cục (Global Error Handling) và Tắt an toàn (Graceful Shutdown).
 *
 * Tại sao production cần cấu hình như thế này?
 * - Nếu import tracer sau express, các thư viện mạng sẽ không thể tự động tạo span.
 * - Graceful shutdown giúp hoàn tất các request đang dang dở, đẩy nốt log/metrics
 *   trước khi container bị hủy (tránh tình trạng rớt request đột ngột).
 *
 * Rủi ro nếu không làm:
 * - Khi deploy phiên bản mới (Rolling Update), khách hàng sẽ gặp lỗi Connection Reset.
 */

// 1. BẮT BUỘC: Khởi chạy OpenTelemetry trước tiên
require('./tracer');

const express = require('express');
const cors = require('cors');
const { register, httpRequestTotal, httpRequestDurationSeconds } = require('./metrics');
const { logger } = require('./logger');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// 2. Middleware cơ bản
app.use(cors());
app.use(express.json());

// 3. Observability Middleware: Đo lường mọi HTTP Request qua Prometheus & Logging
app.use((req, res, next) => {
  // Bỏ qua endpoint /metrics và /health để tránh làm nhiễu số liệu thống kê (Noise Reduction)
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const statusCode = res.statusCode.toString();
    const route = req.route ? req.baseUrl + req.route.path : req.path;

    // Ghi nhận số liệu vào Prometheus
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe({
      method: req.method,
      route,
      status_code: statusCode,
    }, durationSeconds);

    // Ghi log cấu trúc
    const logLevel = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
    logger.log(logLevel, `HTTP ${req.method} ${req.originalUrl} - ${statusCode} (${(durationSeconds * 1000).toFixed(1)}ms)`, {
      httpMethod: req.method,
      httpPath: req.originalUrl,
      httpStatus: res.statusCode,
      latencyMs: (durationSeconds * 1000).toFixed(2),
    });
  });

  next();
});

// 4. Endpoint cào số liệu Prometheus (Scrape Target)
app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metricsData = await register.metrics();
    res.end(metricsData);
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// 5. Health Check Endpoint cho Docker và K8s Liveness/Readiness Probes
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
  });
});

// 6. Đăng ký các Route nghiệp vụ
app.use('/api', orderRoutes);

// 7. Middleware xử lý lỗi tập trung toàn cục (Global Error Handling)
app.use((err, req, res, _next) => {
  const statusCode = err.status || 500;
  logger.error(`[GlobalErrorHandler] Bắt được ngoại lệ chưa xử lý: ${err.message}`, {
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
    url: req.originalUrl,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message,
      statusCode,
    },
  });
});

// 8. Khởi chạy Server
const server = app.listen(PORT, () => {
  logger.info(`================================================================`);
  logger.info(`🚀 Observability Backend Server đang chạy tại port ${PORT}`);
  logger.info(`📊 Prometheus Metrics endpoint: http://localhost:${PORT}/metrics`);
  logger.info(`🏥 Health Check endpoint:       http://localhost:${PORT}/health`);
  logger.info(`================================================================`);
});

// 9. Cơ chế tắt an toàn (Graceful Shutdown)
function handleShutdown(signal) {
  logger.info(`[Process] Nhận tín hiệu ${signal}. Đang đóng các kết nối an toàn...`);
  server.close(() => {
    logger.info('[Process] Server HTTP đã dừng nhận request mới.');
    process.exit(0);
  });

  // Buộc tắt sau 10 giây nếu các kết nối treo
  setTimeout(() => {
    logger.error('[Process] Quá thời gian chờ shutdown, buộc dừng tiến trình.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;
