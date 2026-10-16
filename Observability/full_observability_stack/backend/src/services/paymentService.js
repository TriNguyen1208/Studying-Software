/**
 * ============================================================================
 * PAYMENT SERVICE (CỔNG THANH TOÁN MÔ PHỎNG & ERROR/LATENCY INJECTION)
 * ============================================================================
 * Đoạn này làm gì?
 * - Xử lý giao dịch thanh toán trực tuyến qua các cổng (Stripe, PayPal, MoMo).
 * - Sử dụng Prometheus Histogram đo thời gian phản hồi của mạng bên thứ ba.
 * - Đếm số lượng lỗi thanh toán qua Counter (order_payment_failures_total).
 * - Cho phép tiêm lỗi (Chaos Engineering: 500 error, Timeout) để kiểm chứng
 *   Dashboard Grafana và Jaeger Trace hiển thị Span đỏ (Error Status).
 */

const { withSpan } = require('../tracer');
const { externalCallDurationSeconds, paymentFailuresTotal } = require('../metrics');
const { logger } = require('../logger');

async function processPayment({ orderId, amount, customerId, simulateFail = false, simulateDelayMs = 0 }) {
  const startTime = Date.now();
  const gateway = 'Stripe_Mock_Gateway';

  return withSpan('payment.gateway_charge', {
    'payment.order_id': orderId,
    'payment.amount': amount,
    'payment.currency': 'USD',
    'payment.gateway': gateway,
  }, async (span) => {
    logger.info(`[PaymentService] Bắt đầu gọi API thanh toán qua ${gateway}`, {
      orderId,
      amount,
      customerId,
    });

    // Mô phỏng độ trễ mạng Internet / Third-party Latency
    const latency = simulateDelayMs > 0 ? simulateDelayMs : (Math.floor(Math.random() * 50) + 30);
    await new Promise((resolve) => setTimeout(resolve, latency));

    const durationSeconds = (Date.now() - startTime) / 1000;

    // Tiêm lỗi giả lập (Chaos Testing)
    if (simulateFail) {
      paymentFailuresTotal.inc({ reason: 'gateway_timeout_or_card_declined' });
      externalCallDurationSeconds.observe({ gateway, status: 'failed' }, durationSeconds);

      span.setAttribute('error', true);
      span.setAttribute('payment.error_code', 'CARD_DECLINED_OR_TIMEOUT');

      logger.error(`[PaymentService] Giao dịch thanh toán thất bại cho đơn hàng ${orderId}! Thẻ bị từ chối hoặc cổng thanh toán sập.`, {
        orderId,
        amount,
        durationSeconds,
      });

      throw new Error(`Cổng thanh toán ${gateway} phản hồi lỗi 502: Thẻ tín dụng bị từ chối hoặc kết nối bị từ chối!`);
    }

    // Thanh toán thành công
    externalCallDurationSeconds.observe({ gateway, status: 'success' }, durationSeconds);
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    span.setAttribute('payment.transaction_id', transactionId);
    span.setAttribute('payment.status', 'SUCCESS');

    logger.info(`[PaymentService] Thanh toán thành công cho đơn hàng ${orderId}. Mã GD: ${transactionId}`, {
      orderId,
      transactionId,
      durationMs: Date.now() - startTime,
    });

    return {
      transactionId,
      amount,
      status: 'PAID',
      gateway,
    };
  });
}

module.exports = {
  processPayment,
};
