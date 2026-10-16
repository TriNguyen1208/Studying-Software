/**
 * UNIFIED DOMAIN DATA TRANSFER OBJECTS (DTOs)
 * 
 * Đây là các cấu trúc dữ liệu chuẩn mực của hệ thống nội bộ.
 * Adapter có nhiệm vụ:
 * 1. Chuyển UnifiedPaymentRequest -> Cú pháp riêng của Adaptee (JSON Stripe, PayPal v2, VNPay querystring, SOAP XML).
 * 2. Chuyển kết quả thô của Adaptee -> UnifiedPaymentResult / UnifiedRefundResult.
 */

// Trạng thái chuẩn hóa của một giao dịch thanh toán
const PaymentStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
  DECLINED: 'DECLINED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
});

class UnifiedPaymentRequest {
  constructor({
    orderId,
    amount,
    currency = 'USD',
    customerId,
    customerEmail,
    idempotencyKey,
    description,
    paymentMethodDetails = {}
  }) {
    if (!orderId || !amount) {
      throw new Error('orderId và amount là các trường bắt buộc trong UnifiedPaymentRequest');
    }
    this.orderId = String(orderId);
    this.amount = Number(amount);
    this.currency = String(currency).toUpperCase();
    this.customerId = customerId || 'cust_guest';
    this.customerEmail = customerEmail || 'guest@example.com';
    this.idempotencyKey = idempotencyKey;
    this.description = description || `Payment for order ${orderId}`;
    this.paymentMethodDetails = paymentMethodDetails; // { cardNumber, cvv, expMonth, expYear, bankCode, returnUrl, etc. }
  }
}

class UnifiedPaymentResult {
  constructor({
    transactionId,
    orderId,
    gatewayType,
    status,
    amount,
    currency,
    providerTransactionId,
    timestamp = new Date().toISOString(),
    rawProviderResponse = null,
    transformationLogs = []
  }) {
    this.transactionId = transactionId;
    this.orderId = orderId;
    this.gatewayType = gatewayType;
    this.status = status;
    this.amount = amount;
    this.currency = currency;
    this.providerTransactionId = providerTransactionId;
    this.timestamp = timestamp;
    this.rawProviderResponse = rawProviderResponse;
    this.transformationLogs = transformationLogs;
  }
}

class UnifiedRefundRequest {
  constructor({
    transactionId,
    providerTransactionId,
    amount,
    currency,
    reason = 'Customer request'
  }) {
    this.transactionId = transactionId;
    this.providerTransactionId = providerTransactionId;
    this.amount = Number(amount);
    this.currency = currency;
    this.reason = reason;
  }
}

class UnifiedRefundResult {
  constructor({
    refundId,
    transactionId,
    providerRefundId,
    gatewayType,
    status,
    amount,
    currency,
    timestamp = new Date().toISOString(),
    rawProviderResponse = null
  }) {
    this.refundId = refundId;
    this.transactionId = transactionId;
    this.providerRefundId = providerRefundId;
    this.gatewayType = gatewayType;
    this.status = status;
    this.amount = amount;
    this.currency = currency;
    this.timestamp = timestamp;
    this.rawProviderResponse = rawProviderResponse;
  }
}

module.exports = {
  PaymentStatus,
  UnifiedPaymentRequest,
  UnifiedPaymentResult,
  UnifiedRefundRequest,
  UnifiedRefundResult
};
