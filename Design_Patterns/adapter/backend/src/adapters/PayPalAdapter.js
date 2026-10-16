/**
 * ADAPTER 2: PAYPAL PAYMENT ADAPTER
 * 
 * VAI TRÒ TRONG PATTERN:
 * - Implements Target Interface: IPaymentGateway
 * - Holds reference (Composition) to Adaptee: PayPalClientSdk
 * 
 * CÁC BƯỚC BIẾN ĐỔI:
 * 1. Định dạng số: Số thực (10.5) -> Chuỗi 2 số thập phân ("10.50").
 * 2. Cấu trúc lồng: Gom dữ liệu vào mảng purchase_units[0].
 * 3. Token Authentication: Tự động xin bearer token ngầm mà Client không cần biết.
 * 4. Error Mapping: Dịch PayPal INSTRUMENT_DECLINED -> InsufficientFundsException.
 */

const IPaymentGateway = require('../domain/IPaymentGateway');
const { PaymentStatus, UnifiedPaymentResult, UnifiedRefundResult } = require('../domain/PaymentDTOs');
const {
  InsufficientFundsException,
  GatewayTimeoutException,
  PaymentGatewayException
} = require('../domain/Exceptions');
const PayPalClientSdk = require('../adaptees/PayPalClientSdk');

class PayPalAdapter extends IPaymentGateway {
  constructor(payPalSdk = null) {
    super();
    this.payPalSdk = payPalSdk || new PayPalClientSdk();
  }

  get gatewayId() {
    return 'paypal';
  }

  async processPayment(request) {
    const transformationLogs = [];

    transformationLogs.push({
      step: '1_RECEIVE_REQUEST',
      detail: 'Nhận UnifiedPaymentRequest từ Domain Core',
      input: {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency
      }
    });

    // BƯỚC 1: Đảm bảo đã có OAuth2 Token (Adapter giấu kín chi tiết auth này)
    await this.payPalSdk.authenticate();
    transformationLogs.push({
      step: '2_ACQUIRE_OAUTH_TOKEN',
      detail: 'Adapter tự động thực hiện OAuth2 handshake lấy Bearer Token từ PayPal Auth Server'
    });

    // BƯỚC 2: Chuyển đổi sang schema đặc thù của PayPal v2
    const formattedAmount = Number(request.amount).toFixed(2); // PayPal yêu cầu chuỗi '10.00'
    const customId = request.paymentMethodDetails?.simulateError
      ? `simulate_${request.paymentMethodDetails.simulateError}`
      : 'standard_checkout';

    const payPalOrderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: request.orderId,
          description: request.description,
          custom_id: customId,
          amount: {
            currency_code: request.currency,
            value: formattedAmount
          }
        }
      ]
    };

    transformationLogs.push({
      step: '3_ADAPT_PAYLOAD',
      detail: 'Chuyển đổi số float thành chuỗi 2 chữ số thập phân và đóng gói vào cấu trúc purchase_units',
      adaptedPayload: payPalOrderPayload
    });

    try {
      transformationLogs.push({
        step: '4_DISPATCH_TO_ADAPTEE',
        detail: 'Gọi createAndCaptureOrder() của PayPalClientSdk'
      });

      const payPalResponse = await this.payPalSdk.createAndCaptureOrder(payPalOrderPayload);
      const capture = payPalResponse.purchase_units?.[0]?.payments?.captures?.[0];
      const isSuccess = payPalResponse.status === 'COMPLETED' && capture?.status === 'COMPLETED';

      const normalizedResult = new UnifiedPaymentResult({
        transactionId: `TXN_OMNI_${Date.now()}`,
        orderId: request.orderId,
        gatewayType: this.gatewayId,
        status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        amount: request.amount,
        currency: request.currency,
        providerTransactionId: capture?.id || payPalResponse.id,
        rawProviderResponse: payPalResponse,
        transformationLogs
      });

      transformationLogs.push({
        step: '5_NORMALIZE_RESPONSE',
        detail: 'Trích xuất ID từ purchase_units.captures[0] và chuẩn hóa trạng thái COMPLETED -> SUCCESS',
        status: normalizedResult.status,
        providerTxnId: normalizedResult.providerTransactionId
      });

      return normalizedResult;
    } catch (err) {
      if (err.name === 'INSTRUMENT_DECLINED' || err.details?.[0]?.issue === 'PAYER_ACCOUNT_RESTRICTED') {
        throw new InsufficientFundsException(err.message, {
          gatewayType: this.gatewayId,
          originalError: err
        });
      }

      if (err.name === 'GATEWAY_TIMEOUT') {
        throw new GatewayTimeoutException(err.message, {
          gatewayType: this.gatewayId,
          originalError: err
        });
      }

      throw new PaymentGatewayException(err.message || 'Lỗi không xác định từ PayPal API', {
        gatewayType: this.gatewayId,
        originalError: err
      });
    }
  }

  async processRefund(request) {
    const refundData = {
      amount: {
        value: Number(request.amount).toFixed(2),
        currency_code: request.currency
      }
    };

    const ppRefund = await this.payPalSdk.refundCapture(request.providerTransactionId, refundData);

    return new UnifiedRefundResult({
      refundId: `REFUND_OMNI_${Date.now()}`,
      transactionId: request.transactionId,
      providerRefundId: ppRefund.id,
      gatewayType: this.gatewayId,
      status: ppRefund.status === 'COMPLETED' ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
      amount: request.amount,
      currency: request.currency,
      rawProviderResponse: ppRefund
    });
  }

  async verifyWebhook(rawPayload, headers) {
    return {
      eventType: rawPayload.event_type || 'CHECKOUT.ORDER.APPROVED',
      providerEventId: rawPayload.id || `wh_${Date.now()}`,
      gatewayType: this.gatewayId,
      data: rawPayload
    };
  }

  async checkHealth() {
    return {
      gatewayId: this.gatewayId,
      status: 'UP',
      latencyMs: 78,
      version: 'v2-REST'
    };
  }
}

module.exports = PayPalAdapter;
