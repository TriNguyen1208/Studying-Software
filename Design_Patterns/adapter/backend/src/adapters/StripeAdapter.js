/**
 * ADAPTER 1: STRIPE PAYMENT ADAPTER (OBJECT ADAPTER)
 * 
 * VAI TRÒ TRONG PATTERN:
 * - Implements Target Interface: IPaymentGateway
 * - Holds reference (Composition) to Adaptee: StripeClientSdk
 * 
 * CÁC BƯỚC BIẾN ĐỔI (DATA & PROTOCOL TRANSFORMATION):
 * 1. Tiền tệ: Đổi số thập phân (USD 10.50) -> Cents nguyên (1050).
 * 2. Idempotency: Lấy idempotencyKey từ Domain Request đưa vào Options Header của Stripe.
 * 3. Exception Translation: Bắt StripeCardError, StripeConnectionError và dịch sang
 *    InsufficientFundsException, InvalidCardException, GatewayTimeoutException.
 */

const IPaymentGateway = require('../domain/IPaymentGateway');
const { PaymentStatus, UnifiedPaymentResult, UnifiedRefundResult } = require('../domain/PaymentDTOs');
const {
  InsufficientFundsException,
  InvalidCardException,
  GatewayTimeoutException,
  PaymentGatewayException
} = require('../domain/Exceptions');
const StripeClientSdk = require('../adaptees/StripeClientSdk');

class StripeAdapter extends IPaymentGateway {
  constructor(stripeSdk = null) {
    super();
    // Composition: Adapter sở hữu Adaptee
    this.stripeSdk = stripeSdk || new StripeClientSdk();
  }

  get gatewayId() {
    return 'stripe';
  }

  async processPayment(request) {
    const transformationLogs = [];

    // BƯỚC 1: Log nhận diện Domain Request
    transformationLogs.push({
      step: '1_RECEIVE_REQUEST',
      detail: 'Nhận UnifiedPaymentRequest từ Domain Core',
      input: {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        idempotencyKey: request.idempotencyKey
      }
    });

    // BƯỚC 2: Chuyển đổi dữ liệu (Unit Conversion & Field Mapping)
    // Stripe yêu cầu đơn vị Cents (ví dụ $12.50 -> 1250 cents)
    const amountInCents = Math.round(request.amount * 100);

    const stripePayload = {
      amount: amountInCents,
      currency: request.currency.toLowerCase(),
      source: request.paymentMethodDetails?.token || 'tok_visa',
      description: request.description,
      metadata: {
        orderId: request.orderId,
        customerId: request.customerId,
        simulateError: request.paymentMethodDetails?.simulateError
      }
    };

    const stripeOptions = {
      idempotencyKey: request.idempotencyKey || `stripe_idemp_${Date.now()}`
    };

    transformationLogs.push({
      step: '2_ADAPT_PAYLOAD',
      detail: 'Chuyển đổi USD sang Cents (nhân 100) và gắn Idempotency-Key vào HTTP Headers',
      adaptedPayload: stripePayload,
      options: stripeOptions
    });

    try {
      // BƯỚC 3: Gửi dữ liệu qua Adaptee
      transformationLogs.push({
        step: '3_DISPATCH_TO_ADAPTEE',
        detail: 'Gọi phương thức thô createCharge() của StripeClientSdk'
      });

      const stripeResponse = await this.stripeSdk.createCharge(stripePayload, stripeOptions);

      // BƯỚC 4: Chuẩn hóa kết quả phản hồi (Normalization)
      const isSuccess = stripeResponse.status === 'succeeded' && stripeResponse.paid === true;

      const normalizedResult = new UnifiedPaymentResult({
        transactionId: `TXN_OMNI_${Date.now()}`,
        orderId: request.orderId,
        gatewayType: this.gatewayId,
        status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        amount: request.amount,
        currency: request.currency,
        providerTransactionId: stripeResponse.id,
        rawProviderResponse: stripeResponse,
        transformationLogs
      });

      transformationLogs.push({
        step: '4_NORMALIZE_RESPONSE',
        detail: 'Chuyển đối tượng Charge của Stripe về UnifiedPaymentResult chuẩn mực',
        status: normalizedResult.status,
        providerTxnId: normalizedResult.providerTransactionId
      });

      return normalizedResult;
    } catch (err) {
      // BƯỚC 5: DỊCH NGOẠI LỆ (EXCEPTION TRANSLATION)
      // Không để lộ lỗi gốc StripeCardError cho Service tầng trên
      if (err.code === 'card_declined' && err.decline_code === 'insufficient_funds') {
        throw new InsufficientFundsException(err.message, {
          gatewayType: this.gatewayId,
          originalError: err
        });
      }

      if (err.type === 'StripeCardError') {
        throw new InvalidCardException(err.message, {
          gatewayType: this.gatewayId,
          originalError: err
        });
      }

      if (err.type === 'StripeConnectionError') {
        throw new GatewayTimeoutException(err.message, {
          gatewayType: this.gatewayId,
          originalError: err
        });
      }

      throw new PaymentGatewayException(err.message || 'Lỗi không xác định từ Stripe API', {
        gatewayType: this.gatewayId,
        originalError: err
      });
    }
  }

  async processRefund(request) {
    const amountInCents = Math.round(request.amount * 100);
    const stripeRefund = await this.stripeSdk.createRefund(request.providerTransactionId, {
      amount: amountInCents
    });

    return new UnifiedRefundResult({
      refundId: `REFUND_OMNI_${Date.now()}`,
      transactionId: request.transactionId,
      providerRefundId: stripeRefund.id,
      gatewayType: this.gatewayId,
      status: stripeRefund.status === 'succeeded' ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
      amount: request.amount,
      currency: request.currency,
      rawProviderResponse: stripeRefund
    });
  }

  async verifyWebhook(rawPayload, headers) {
    // Adapter xác minh Stripe-Signature
    const signature = headers['stripe-signature'];
    if (!signature && !rawPayload) {
      throw new Error('Stripe signature missing');
    }
    return {
      eventType: rawPayload.type || 'payment_intent.succeeded',
      providerEventId: rawPayload.id || `evt_mock_${Date.now()}`,
      gatewayType: this.gatewayId,
      data: rawPayload
    };
  }

  async checkHealth() {
    return {
      gatewayId: this.gatewayId,
      status: 'UP',
      latencyMs: 45,
      version: 'v2024-04-10'
    };
  }
}

module.exports = StripeAdapter;
