/**
 * DOMAIN EXCEPTIONS (CHUẨN HÓA MÃ LỖI)
 * 
 * Một trong những vai trò quan trọng bậc nhất của Adapter Pattern là:
 * "EXCEPTION TRANSLATION / ERROR CODE NORMALIZATION"
 * 
 * - Nếu không có Adapter: Tầng Service phải viết if-else bắt StripeCardError,
 *   bắt PayPal UnprocessableEntity, bắt VNPay ResponseCode 51, bắt XML SOAP Fault.
 * - Khi có Adapter: Mọi lỗi của bên thứ 3 đều được Adapter "dịch" (translate)
 *   về một trong các Domain Exception chuẩn mực dưới đây.
 */

class PaymentGatewayException extends Error {
  constructor(message, { code = 'PAYMENT_FAILED', gatewayType, originalError = null, retryable = false } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.gatewayType = gatewayType;
    this.originalError = originalError;
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InsufficientFundsException extends PaymentGatewayException {
  constructor(message = 'Tài khoản không đủ số dư để thực hiện giao dịch', options = {}) {
    super(message, { ...options, code: 'INSUFFICIENT_FUNDS', retryable: false });
  }
}

class InvalidCardException extends PaymentGatewayException {
  constructor(message = 'Thông tin thẻ không hợp lệ hoặc đã hết hạn', options = {}) {
    super(message, { ...options, code: 'INVALID_CARD', retryable: false });
  }
}

class GatewayTimeoutException extends PaymentGatewayException {
  constructor(message = 'Cổng thanh toán phản hồi quá lâu hoặc mất kết nối mạng', options = {}) {
    super(message, { ...options, code: 'GATEWAY_TIMEOUT', retryable: true });
  }
}

class FraudDetectedException extends PaymentGatewayException {
  constructor(message = 'Giao dịch bị từ chối do nghi vấn rủi ro gian lận', options = {}) {
    super(message, { ...options, code: 'FRAUD_DETECTED', retryable: false });
  }
}

module.exports = {
  PaymentGatewayException,
  InsufficientFundsException,
  InvalidCardException,
  GatewayTimeoutException,
  FraudDetectedException
};
