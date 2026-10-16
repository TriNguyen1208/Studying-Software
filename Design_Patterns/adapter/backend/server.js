/**
 * PRODUCTION-GRADE EXPRESS APPLICATION SERVER
 * 
 * Áp dụng tiêu chuẩn Enterprise:
 * 1. Global Error Handling với mã hóa HTTP status chuẩn (400, 402, 502, 504).
 * 2. Graceful Shutdown xử lý SIGINT, SIGTERM để đóng DB Connection Pool và Redis an toàn.
 * 3. CORS & Security middleware.
 * 4. Tách biệt Route, Controller, Service, Adapter theo kiến trúc Clean / Hexagonal.
 */

const express = require('express');
const cors = require('cors');
const { initDatabase, closePool } = require('./src/config/db');
const { initRedis, closeRedis } = require('./src/config/redis');
const paymentController = require('./src/controllers/PaymentController');
const gatewayController = require('./src/controllers/GatewayController');
const {
  PaymentGatewayException,
  InsufficientFundsException,
  InvalidCardException,
  GatewayTimeoutException,
  FraudDetectedException
} = require('./src/domain/Exceptions');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware cơ bản
app.use(cors({
  origin: '*', // Hỗ trợ kết nối từ Vite dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'omnipay-adapter-backend',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// ROUTES: PAYMENTS & CHECKOUT
// ==========================================
app.post('/api/payments/checkout', (req, res, next) => paymentController.checkout(req, res, next));
app.post('/api/payments/refund', (req, res, next) => paymentController.refund(req, res, next));
app.get('/api/payments/transactions', (req, res, next) => paymentController.getTransactions(req, res, next));
app.get('/api/payments/audit-logs', (req, res, next) => paymentController.getAuditLogs(req, res, next));

// ==========================================
// ROUTES: GATEWAYS & RESILIENCE
// ==========================================
app.get('/api/gateways', (req, res, next) => gatewayController.getGateways(req, res, next));
app.get('/api/gateways/circuit-breaker', (req, res, next) => gatewayController.getCircuitBreakerStatus(req, res, next));
app.post('/api/gateways/circuit-breaker/reset', (req, res, next) => gatewayController.resetCircuit(req, res, next));

// ==========================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================
// Dịch Exception Domain sang HTTP Response Code tương ứng
app.use((err, req, res, next) => {
  console.error(`[Global Error Handler] Caught exception: [${err.name}] ${err.message}`);

  if (err instanceof InsufficientFundsException) {
    return res.status(402).json({
      success: false,
      errorType: 'INSUFFICIENT_FUNDS',
      message: err.message,
      gateway: err.gatewayType
    });
  }

  if (err instanceof InvalidCardException) {
    return res.status(400).json({
      success: false,
      errorType: 'INVALID_CARD',
      message: err.message,
      gateway: err.gatewayType
    });
  }

  if (err instanceof FraudDetectedException) {
    return res.status(403).json({
      success: false,
      errorType: 'FRAUD_DETECTED',
      message: err.message,
      gateway: err.gatewayType
    });
  }

  if (err instanceof GatewayTimeoutException) {
    return res.status(504).json({
      success: false,
      errorType: 'GATEWAY_TIMEOUT',
      message: err.message,
      gateway: err.gatewayType,
      retryable: true
    });
  }

  if (err.message && err.message.startsWith('CircuitBreakerOpen')) {
    return res.status(503).json({
      success: false,
      errorType: 'CIRCUIT_BREAKER_OPEN',
      message: err.message
    });
  }

  if (err instanceof PaymentGatewayException) {
    return res.status(502).json({
      success: false,
      errorType: err.code || 'BAD_GATEWAY',
      message: err.message,
      gateway: err.gatewayType
    });
  }

  return res.status(500).json({
    success: false,
    errorType: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Lỗi máy chủ nội bộ'
  });
});

// ==========================================
// BOOTSTRAP & GRACEFUL SHUTDOWN
// ==========================================
let server = null;

async function startServer() {
  // Khởi tạo DB & Cache
  await initDatabase();
  initRedis();

  server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 OMNIPAY ADAPTER BACKEND ĐANG CHẠY TẠI http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Gateways API: http://localhost:${PORT}/api/gateways`);
    console.log(`=======================================================`);
  });
}

// Xử lý Graceful Shutdown khi nhận tín hiệu dừng từ Docker / OS
async function handleShutdown(signal) {
  console.log(`\n[Server] Nhận tín hiệu ${signal}. Bắt đầu quy trình Graceful Shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] Đã dừng tiếp nhận HTTP requests mới.');
      await closePool();
      await closeRedis();
      console.log('[Server] Toàn bộ tài nguyên đã được giải phóng an toàn. Goodbye!');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
