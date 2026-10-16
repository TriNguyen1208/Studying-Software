/**
 * ============================================================================
 * PROMETHEUS METRICS REGISTRY (PROM-CLIENT)
 * ============================================================================
 * Đoạn này làm gì?
 * - Khởi tạo Registry trung tâm của prom-client để gom các số liệu đo lường.
 * - Đăng ký Default Metrics: Theo dõi tình trạng NodeJS Runtime (V8 Heap Memory,
 *   Event Loop Lag, CPU usage, Active handles).
 * - Đăng ký Application Metrics theo chuẩn Golden Signals (Rate, Errors, Duration).
 *
 * Tại sao production cần cấu hình như thế này?
 * - Prometheus hoạt động theo cơ chế PULL: Định kỳ mỗi 3s-15s, Prometheus Server
 *   sẽ gửi HTTP GET đến endpoint /metrics để cào (scrape) các số liệu này.
 * - Sử dụng Histogram cho Duration giúp tính toán chính xác các phân vị P50, P95, P99
 *   bằng hàm histogram_quantile() trong PromQL mà không bị sai số trung bình (Mean).
 *
 * Rủi ro nếu không làm:
 * - Nếu không có metrics đo lường, bạn không thể thiết lập SLA/SLO (ví dụ: 99% request
 *   phải dưới 200ms) và không thể cấu hình cảnh báo sớm trước khi sập hệ thống.
 */

const client = require('prom-client');

// 1. Tạo Registry riêng biệt (tránh xung đột với global registry)
const register = new client.Registry();

// Thêm các nhãn mặc định gắn vào mọi metric
register.setDefaultLabels({
  app: 'order-payment-service',
  environment: process.env.NODE_ENV || 'production-simulation',
});

// 2. Kích hoạt thu thập Default Metrics của Node.js (CPU, Memory Heap, Event Loop)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2], // Buckets cho Garbage Collection
});

// 3. Counter: Đếm tổng số lượng HTTP request đến hệ thống (Rate Calculation)
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Tổng số lượng HTTP requests được xử lý',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// 4. Histogram: Đo lường độ trễ của các request (Duration / Latency Distribution)
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Thời gian phản hồi của HTTP request tính bằng giây',
  labelNames: ['method', 'route', 'status_code'],
  // Phân bố các xô (buckets) từ 5ms đến 10s để đo chính xác từ request siêu tốc đến siêu trễ
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
  registers: [register],
});

// 5. Gauge: Đo số lượng đơn hàng đang được xử lý đồng thời trong bộ nhớ (In-flight)
const activeOrdersGauge = new client.Gauge({
  name: 'active_orders_count',
  help: 'Số lượng đơn hàng đang trong quá trình thanh toán và xử lý',
  registers: [register],
});

// 6. Counter: Đếm số lượng giao dịch thanh toán thất bại
const paymentFailuresTotal = new client.Counter({
  name: 'order_payment_failures_total',
  help: 'Tổng số lượt thanh toán đơn hàng bị lỗi',
  labelNames: ['reason'],
  registers: [register],
});

// 7. Gauge: Tồn kho của các mặt hàng
const inventoryStockGauge = new client.Gauge({
  name: 'inventory_stock_quantity',
  help: 'Số lượng hàng tồn kho của sản phẩm',
  labelNames: ['item_id', 'item_name'],
  registers: [register],
});

// 8. Histogram: Thời gian gọi sang dịch vụ bên thứ ba (Third-party Payment Gateway)
const externalCallDurationSeconds = new client.Histogram({
  name: 'external_payment_gateway_duration_seconds',
  help: 'Thời gian gọi sang Payment Gateway mô phỏng bên ngoài',
  labelNames: ['gateway', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 3.0],
  registers: [register],
});

module.exports = {
  register,
  httpRequestTotal,
  httpRequestDurationSeconds,
  activeOrdersGauge,
  paymentFailuresTotal,
  inventoryStockGauge,
  externalCallDurationSeconds,
};
