/**
 * ==============================================================================
 * PRODUCTION-GRADE BACKEND SERVICE REPLICA (NGINX DEEP DIVE)
 * ==============================================================================
 * File này đóng vai trò là một Node Backend Instance độc lập nằm phía sau Nginx Upstream.
 * Trong kiến trúc Production, nhiều bản sao (replicas) của file này sẽ chạy song song
 * để chia sẻ tải và đảm bảo High Availability (HA).
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Đọc cấu hình từ biến môi trường
const PORT = process.env.PORT || 3001;
const INSTANCE_ID = process.env.INSTANCE_ID || `backend-instance-${process.pid}`;

// Biến theo dõi số lượng request phục vụ của instance này
let requestCounter = 0;
const startTime = Date.now();

// ------------------------------------------------------------------------------
// MIDDLEWARE CONFIGURATION
// ------------------------------------------------------------------------------

/**
 * TẠI SAO CẦN CORS Ở ĐÂY?
 * Trong production, Nginx có thể đứng làm proxy cùng origin, nhưng khi client
 * gọi trực tiếp hoặc khi phát triển local, CORS giúp tránh lỗi trình duyệt chặn request.
 */
app.use(cors());
app.use(express.json());

/**
 * CUSTOM MIDDLEWARE: GẮN IDENTIFIER VÀO HEADER PHẢN HỒI
 * Đoạn này làm gì?
 * - Gắn định danh của Instance này (`X-Backend-Instance`) vào mọi HTTP response.
 * Tại sao cần trong production?
 * - Giúp Developer, QA và hệ thống quan sát (Observability/Logging) biết chính xác
 *   request nào được xử lý bởi node nào, phục vụ việc kiểm tra cân bằng tải (Load Balancing)
 *   và truy vết lỗi (Troubleshooting).
 */
app.use((req, res, next) => {
  requestCounter++;
  res.setHeader('X-Backend-Instance', INSTANCE_ID);
  res.setHeader('X-Process-PID', process.pid);
  next();
});

// ------------------------------------------------------------------------------
// DỮ LIỆU MẪU (MOCK PRODUCT CATALOG)
// ------------------------------------------------------------------------------
const MOCK_PRODUCTS = [
  { id: 'prod-001', name: 'MacBook Pro M3 Max 64GB', price: 3499, category: 'Laptops', inStock: 12 },
  { id: 'prod-002', name: 'Sony WH-1000XM5 Noise Cancelling', price: 399, category: 'Audio', inStock: 45 },
  { id: 'prod-003', name: 'Dell UltraSharp 32 4K USB-C Hub', price: 899, category: 'Monitors', inStock: 8 },
  { id: 'prod-004', name: 'Keychron Q1 Pro Wireless Custom', price: 199, category: 'Keyboards', inStock: 30 },
  { id: 'prod-005', name: 'Logitech MX Master 3S Mouse', price: 99, category: 'Accessories', inStock: 78 }
];

// ------------------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------------------

/**
 * 1. HEALTHCHECK ENDPOINT
 * Đoạn này làm gì?
 * - Trả về trạng thái hoạt động của instance (HTTP 200).
 * Tại sao trong production lại cần?
 * - Docker healthcheck, Kubernetes liveness/readiness probe, hoặc Nginx Plus active health
 *   check cần endpoint này để tự động cô lập (isolate) các node bị sập ra khỏi upstream pool.
 * Rủi ro nếu không có: Nginx sẽ tiếp tục điều phối khách hàng vào một node đã chết -> HTTP 502 Bad Gateway.
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    instanceId: INSTANCE_ID,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

/**
 * 2. LOAD BALANCING INSPECTION API
 * Đoạn này làm gì?
 * - Phản hồi thông tin định danh của node kèm IP người dùng mà Nginx đã chuyển tiếp.
 * Tại sao cần kiểm tra IP client ở đây?
 * - Minh chứng Nginx đã forward chính xác các header `X-Real-IP` và `X-Forwarded-For`.
 */
app.get('/api/load-test', (req, res) => {
  const clientRealIp = req.headers['x-real-ip'] || req.socket.remoteAddress;
  const forwardedFor = req.headers['x-forwarded-for'] || 'none';
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol;

  res.status(200).json({
    message: 'Request handled successfully by upstream backend!',
    handledBy: INSTANCE_ID,
    processPid: process.pid,
    totalRequestsOnThisNode: requestCounter,
    clientMetadata: {
      realIp: clientRealIp,
      forwardedFor: forwardedFor,
      proto: forwardedProto,
      host: req.headers['host']
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 3. PRODUCT CATALOG API (READ-HEAVY FOR MICROCACHING TEST)
 * Đoạn này làm gì?
 * - Trả về danh sách sản phẩm nhưng có thêm giả lập độ trễ xử lý (100ms - 150ms).
 * Tại sao cần giả lập độ trễ?
 * - Để người học quan sát sự khác biệt rõ rệt giữa:
 *   + Cache MISS: Phải chờ backend xử lý (~150ms).
 *   + Cache HIT: Nginx trả ngay lập tức từ bộ nhớ đệm (~1ms).
 */
app.get('/api/products', (req, res) => {
  const delayMs = 120; // Giả lập thời gian truy vấn DB

  setTimeout(() => {
    res.status(200).json({
      success: true,
      instanceId: INSTANCE_ID,
      latencySimulatedMs: delayMs,
      data: MOCK_PRODUCTS,
      serverTime: new Date().toISOString()
    });
  }, delayMs);
});

/**
 * 4. SYSTEM STATS ENDPOINT
 * Trả về thông số RAM và số lượng request đã phục vụ
 */
app.get('/api/stats', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    instanceId: INSTANCE_ID,
    pid: process.pid,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    totalRequestsHandled: requestCounter,
    memory: {
      rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
    }
  });
});

// ------------------------------------------------------------------------------
// GLOBAL ERROR HANDLING & GRACEFUL SHUTDOWN
// ------------------------------------------------------------------------------

// Bắt lỗi không xác định
app.use((err, req, res, next) => {
  console.error(`[${INSTANCE_ID}] Unhandled Error:`, err);
  res.status(500).json({
    error: 'Internal Server Error',
    instanceId: INSTANCE_ID,
    message: err.message
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [${INSTANCE_ID}] Backend replica is online and listening on port ${PORT}`);
});

/**
 * CƠ CHẾ GRACEFUL SHUTDOWN
 * Tại sao bắt buộc phải có trong production?
 * - Khi Nginx reload hoặc khi rolling update container, nếu process bị kill đột ngột (SIGKILL),
 *   các request của khách hàng đang được xử lý dở sẽ bị đứt kết nối (connection reset).
 * - Bắt tín hiệu SIGTERM / SIGINT để ngừng nhận kết nối mới, đợi các request dở dang hoàn tất
 *   rồi mới thoát an toàn.
 */
const handleGracefulShutdown = (signal) => {
  console.log(`⚠️ [${INSTANCE_ID}] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log(`✅ [${INSTANCE_ID}] Closed all active HTTP connections. Process exiting.`);
    process.exit(0);
  });

  // Giới hạn thời gian chờ tối đa 10s trước khi buộc thoát
  setTimeout(() => {
    console.error(`❌ [${INSTANCE_ID}] Forcing shutdown due to timeout!`);
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
