const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase, pool } = require('./src/config/database');
const redis = require('./src/config/redis');
const { createIdempotencyMiddleware } = require('./src/middleware/idempotencyMiddleware');
const paymentController = require('./src/controllers/paymentController');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware cơ bản
app.use(cors());
app.use(express.json());

// Logger request đơn giản
app.use((req, res, next) => {
  const start = Date.now();
  const idempKey = req.headers['idempotency-key'] || 'NONE';
  res.on('finish', () => {
    const duration = Date.now() - start;
    const cacheStatus = res.getHeader('X-Cache-Lookup') || 'N/A';
    console.log(
      `[${req.method}] ${req.originalUrl} - Status: ${res.statusCode} | Duration: ${duration}ms | IdempKey: ${idempKey} | Cache: ${cacheStatus}`
    );
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.status(200).json({ status: 'OK', postgres: 'UP', redis: 'UP', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'DEGRADED', error: err.message });
  }
});

// Middleware Idempotency bảo vệ riêng route chuyển tiền / thanh toán
const idempotencyMiddleware = createIdempotencyMiddleware({
  lockTtlMs: 15000,
  cacheTtlSec: 86400,
});

// API Routes
app.post('/api/transfer', idempotencyMiddleware, (req, res, next) => paymentController.transfer(req, res, next));
app.get('/api/accounts', (req, res, next) => paymentController.getAccounts(req, res, next));
app.get('/api/transactions', (req, res, next) => paymentController.getTransactions(req, res, next));
app.get('/api/idempotency-keys', (req, res, next) => paymentController.getIdempotencyRecords(req, res, next));
app.post('/api/reset', (req, res, next) => paymentController.resetData(req, res, next));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Đã xảy ra lỗi không xác định tại máy chủ.',
    code: err.code || 'SERVER_ERROR',
  });
});

// Khởi chạy Server
async function startServer() {
  try {
    console.log('[Bootstrap] Đang kiểm tra kết nối Database & Schema...');
    await initDatabase();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 NexusPay Idempotency Engine đang chạy tại Port: ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[Graceful Shutdown] Nhận tín hiệu ${signal}. Đang đóng kết nối an toàn...`);
      server.close(async () => {
        try {
          await pool.end();
          await redis.quit();
          console.log('[Graceful Shutdown] Hoàn tất đóng kết nối Postgres và Redis. Bye!');
          process.exit(0);
        } catch (err) {
          console.error('[Graceful Shutdown Error]', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Bootstrap Error] Không thể khởi động máy chủ:', error);
    process.exit(1);
  }
}

startServer();
