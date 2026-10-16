/**
 * ============================================================================
 * OPENTELEMETRY TRACER CONFIGURATION (JAEGER EXPORTER VIA OTLP)
 * ============================================================================
 * Đoạn này làm gì?
 * - Khởi tạo OpenTelemetry Node SDK, tự động instrument các gói HTTP/Express.
 * - Thu thập Spans (các đoạn xử lý) và chuyển đổi sang định dạng OTLP tiêu chuẩn.
 * - Xuất (Export) spans đến Jaeger Collector thông qua OTLP HTTP (Port 4318).
 *
 * Tại sao production cần cấu hình như thế này?
 * - OTLP (OpenTelemetry Protocol) là chuẩn công nghiệp mở (vendor-agnostic).
 * - Sử dụng BatchSpanProcessor giúp gom cụm (batch) các spans trong bộ nhớ đệm
 *   trước khi gửi qua mạng, tránh việc gửi từng span đơn lẻ gây bão I/O mạng.
 *
 * Rủi ro nếu không làm:
 * - Khi hệ thống bị lỗi phân tán hoặc chậm (latency spike), bạn hoàn toàn mù
 *   thông tin, không biết request bị tắc ở microservice nào, query DB nào.
 */

const opentelemetry = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const JAEGER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const SERVICE_NAME = 'order-payment-service';

// 1. Khởi tạo Exporter gửi span về Jaeger OTLP endpoint
const traceExporter = new OTLPTraceExporter({
  url: JAEGER_OTLP_ENDPOINT,
  timeoutMillis: 5000,
});

// 2. Định danh tài nguyên cho dịch vụ (Service Name, Environment, Version)
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production-simulation',
});

// 3. Đăng ký SDK với Auto-instrumentation (Express, HTTP, DB)
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Tắt theo dõi đọc file đĩa để tránh spam span rác
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
    }),
  ],
});

try {
  sdk.start();
  console.log(`[OpenTelemetry] Tracer đã khởi chạy thành công. OTLP Target: ${JAEGER_OTLP_ENDPOINT}`);
} catch (error) {
  console.error('[OpenTelemetry] Khởi tạo tracer thất bại:', error);
}

// 4. Helper trích xuất traceId và spanId từ Active Context hiện tại
function getCurrentTraceContext() {
  const activeSpan = opentelemetry.trace.getActiveSpan();
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags,
    };
  }
  return { traceId: null, spanId: null };
}

// 5. Helper tạo Custom Child Span với Tracer thủ công
const tracer = opentelemetry.trace.getTracer(SERVICE_NAME, '1.0.0');

async function withSpan(spanName, attributes = {}, fn) {
  return tracer.startActiveSpan(spanName, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: err.message,
      });
      throw err;
    } finally {
      span.end();
    }
  });
}

// Graceful shutdown khi process nhận tín hiệu dừng
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[OpenTelemetry] SDK terminated gracefully'))
    .catch((err) => console.error('[OpenTelemetry] Error terminating SDK', err));
});

module.exports = {
  tracer,
  withSpan,
  getCurrentTraceContext,
};
