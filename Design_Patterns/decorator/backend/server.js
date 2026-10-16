/**
 * PRODUCTION-GRADE EXPRESS APPLICATION SERVER (DECORATOR PATTERN)
 * 
 * Port: 5003
 */

const express = require('express');
const cors = require('cors');
const { initDatabase, closePool } = require('./src/config/db');
const { initRedis, closeRedis } = require('./src/config/redis');
const pipelineController = require('./src/controllers/PipelineController');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'omnistream-decorator-backend',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.post('/api/pipeline/process', (req, res, next) => pipelineController.processDocument(req, res, next));
app.post('/api/pipeline/benchmark', (req, res, next) => pipelineController.runBenchmark(req, res, next));
app.get('/api/pipeline/audit-logs', (req, res, next) => pipelineController.getAuditLogs(req, res, next));
app.post('/api/pipeline/cache/clear', (req, res, next) => pipelineController.clearCache(req, res, next));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Global Error Handler]: [${err.name || 'Error'}] ${err.message}`);

  if (err.code === 'RATE_LIMIT_EXCEEDED' || err.status === 429) {
    return res.status(429).json({
      success: false,
      errorType: 'RATE_LIMIT_EXCEEDED',
      message: err.message
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    errorType: err.name || 'INTERNAL_ERROR',
    message: err.message || 'Lỗi xử lý server nội bộ'
  });
});

let server = null;

async function startServer() {
  await initDatabase();
  initRedis();

  server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 OMNISTREAM DECORATOR BACKEND ĐANG CHẠY TẠI http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Process API:  http://localhost:${PORT}/api/pipeline/process`);
    console.log(`=======================================================`);
  });
}

async function handleShutdown(signal) {
  console.log(`\n[Server] Nhận tín hiệu ${signal}. Graceful Shutdown...`);
  if (server) {
    server.close(async () => {
      await closePool();
      await closeRedis();
      console.log('[Server] Đã giải phóng toàn bộ tài nguyên. Tạm biệt!');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
