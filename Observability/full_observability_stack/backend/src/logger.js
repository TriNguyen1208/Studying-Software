/**
 * ============================================================================
 * STRUCTURED LOGGER WITH LOKI SHIPPING & TRACE-TO-LOG CORRELATION
 * ============================================================================
 * Đoạn này làm gì?
 * - Cấu hình Winston Logger xuất log định dạng JSON có cấu trúc (Structured Logging).
 * - Tự động trích xuất `trace_id` và `span_id` từ OpenTelemetry Context để gắn vào
 *   mỗi dòng log. Đây là chìa khóa để Grafana liên kết 1-click từ Log -> Jaeger Trace!
 * - Đẩy log bất đồng bộ đến Loki HTTP API (/loki/api/v1/push).
 * - Lưu trữ một circular buffer (100 log gần nhất) trong RAM để phục vụ trực tiếp UI.
 *
 * Tại sao production cần cấu hình như thế này?
 * - Log dạng text tự do không cấu trúc (Unstructured text) rất khó parse, tốn CPU.
 * - JSON log cho phép Loki bóc tách nhãn (labels) và trường (fields) tốc độ cao.
 * - Gắn `trace_id` vào log là quy chuẩn bắt buộc của SRE (Site Reliability Engineering)
 *   để khi có sự cố, kỹ sư chỉ cần lấy trace_id là tra ra toàn bộ nhật ký của request đó.
 *
 * Rủi ro nếu không làm:
 * - Khi có hàng triệu dòng log trong 1 giây, nếu không có trace_id, bạn sẽ phải
 *   "mò kim đáy bể" để biết dòng log lỗi này thuộc về request hay khách hàng nào.
 */

const winston = require('winston');
const axios = require('axios');
const { getCurrentTraceContext } = require('./tracer');

const LOKI_HOST = process.env.LOKI_HOST || 'http://localhost:3100';
const SERVICE_NAME = 'order-payment-service';

// In-memory ring buffer lưu 100 log gần nhất để hiển thị trực tiếp trên Frontend UI
const recentLogsBuffer = [];
const MAX_BUFFER_SIZE = 100;

function pushToMemoryBuffer(logEntry) {
  if (recentLogsBuffer.length >= MAX_BUFFER_SIZE) {
    recentLogsBuffer.shift();
  }
  recentLogsBuffer.push(logEntry);
}

// 1. Custom Format: Tự động trích xuất trace_id và span_id từ OpenTelemetry
const traceCorrelationFormat = winston.format((info) => {
  const { traceId, spanId } = getCurrentTraceContext();
  if (traceId) {
    info.trace_id = traceId;
  }
  if (spanId) {
    info.span_id = spanId;
  }
  info.service_name = SERVICE_NAME;
  return info;
});

// 2. Tạo Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    traceCorrelationFormat(),
    winston.format.json()
  ),
  transports: [
    // In ra Console với màu sắc trực quan khi chạy dev
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, trace_id, ...meta }) => {
          const traceStr = trace_id ? ` [trace_id=${trace_id.substring(0, 8)}...]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]${traceStr}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

// 3. Batching Async Worker đẩy log sang Loki qua HTTP POST /loki/api/v1/push
const pendingLokiLogs = [];
let isShipping = false;

function shipLogsToLoki() {
  if (pendingLokiLogs.length === 0 || isShipping) return;

  isShipping = true;
  const batch = pendingLokiLogs.splice(0, 50);

  // Cấu trúc payload theo đặc tả Loki API: streams với labels và values [timestamp_ns, log_line]
  const streams = [
    {
      stream: {
        service_name: SERVICE_NAME,
        environment: process.env.NODE_ENV || 'production-simulation',
      },
      values: batch.map((item) => [
        (new Date(item.timestamp).getTime() * 1000000).toString(), // Nanoseconds
        JSON.stringify(item),
      ]),
    },
  ];

  axios.post(`${LOKI_HOST}/loki/api/v1/push`, { streams }, { timeout: 3000 })
    .catch((_err) => {
      // Bỏ qua lỗi kết nối Loki nếu Loki chưa sẵn sàng (tránh làm sập ứng dụng)
    })
    .finally(() => {
      isShipping = false;
    });
}

// Định kỳ mỗi 1.5 giây gửi batch log đến Loki
setInterval(shipLogsToLoki, 1500);

// Hook ghi log đồng thời vào Memory Buffer và Loki Queue
const originalLog = logger.log.bind(logger);
logger.log = function (level, msg, meta) {
  const logObj = typeof level === 'object' ? level : { level, message: msg, ...meta };
  const { traceId, spanId } = getCurrentTraceContext();

  const enriched = {
    timestamp: new Date().toISOString(),
    service_name: SERVICE_NAME,
    trace_id: traceId || logObj.trace_id,
    span_id: spanId || logObj.span_id,
    ...logObj,
  };

  pushToMemoryBuffer(enriched);
  pendingLokiLogs.push(enriched);

  return originalLog.apply(logger, arguments);
};

module.exports = {
  logger,
  recentLogsBuffer,
};
