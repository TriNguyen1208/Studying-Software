/**
 * ADAPTER 3: VNPAY PAYMENT ADAPTER
 * 
 * VAI TRÒ TRONG PATTERN:
 * - Implements Target Interface: IPaymentGateway
 * - Holds reference (Composition) to Adaptee: VNPayGatewayClient
 * 
 * CÁC BƯỚC BIẾN ĐỔI:
 * 1. Tiền tệ: Đổi USD -> VND (nếu cần) và nhân 100 theo quy định của ngân hàng nhà nước.
 * 2. Bảo mật: Tạo chữ ký số HMAC-SHA512 trên chuỗi tham số đã sắp xếp Alphabet.
 * 3. Mã phản hồi: Dịch "00" -> SUCCESS, "51" -> InsufficientFundsException, "07" -> FraudDetectedException.
 */

const IPaymentGateway = require('../domain/IPaymentGateway');
const { PaymentStatus, UnifiedPaymentResult, UnifiedRefundResult } = require('../domain/PaymentDTOs');
const {
  InsufficientFundsException,
  FraudDetectedException,
  PaymentGatewayException
} = require('../domain/Exceptions');
const VNPayGatewayClient = require('../adaptees/VNPayGatewayClient');

class VNPayAdapter extends IPaymentGateway {
  constructor(vnpayClient = null) {
    super();
    this.vnpayClient = vnpayClient || new VNPayGatewayClient();
    this.exchangeRateUsdToVnd = 25400; // Tỷ giá quy đổi nếu thanh toán bằng USD
  }

  get gatewayId() {
    return 'vnpay';
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

    // BƯỚC 1: Xử lý quy đổi tiền tệ sang chuẩn VND nếu Domain gửi USD
    let amountInVnd = request.amount;
    if (request.currency === 'USD') {
      amountInVnd = Math.round(request.amount * this.exchangeRateUsdToVnd);
      transformationLogs.push({
        step: '2_CURRENCY_CONVERSION',
        detail: `Quy đổi tiền tệ: $${request.amount} USD * ${this.exchangeRateUsdToVnd} = ${amountInVnd.toLocaleString('vi-VN')} VND`
      });
    }

    // VNPay yêu cầu nhân 100 đơn vị tiền tệ cơ bản
    const vnpAmount = amountInVnd * 100;

    // BƯỚC 2: Đóng gói tham số theo chuẩn VNPay
    const orderInfo = request.paymentMethodDetails?.simulateError
      ? `simulate_${request.paymentMethodDetails.simulateError}`
      : `Thanh toan don hang ${request.orderId}`;

    const rawParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpayClient.tmnCode,
      vnp_Amount: vnpAmount,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: request.orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: 'https://omnipay.io/checkout/vnpay-return',
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14)
    };

    // BƯỚC 3: Tính toán mã băm mật mã HMAC-SHA512
    const secureHash = this.vnpayClient.calculateChecksum(rawParams);
    rawParams.vnp_SecureHash = secureHash;

    transformationLogs.push({
      step: '3_HMAC_SIGNATURE_GENERATION',
      detail: 'Sắp xếp tham số ASCII A-Z và tính mã băm bảo mật HMAC-SHA512',
      secureHash: secureHash.substring(0, 16) + '...'
    });

    try {
      transformationLogs.push({
        step: '4_DISPATCH_TO_ADAPTEE',
        detail: 'Gọi submitPaymentRequest() của VNPayGatewayClient'
      });

      const vnpResponse = await this.vnpayClient.submitPaymentRequest(rawParams);

      // BƯỚC 4: Phân tích mã phản hồi VNPay Response Code
      if (vnpResponse.vnp_ResponseCode === '51') {
        throw new InsufficientFundsException(vnpResponse.vnp_Message || 'Số dư tài khoản ngân hàng không đủ', {
          gatewayType: this.gatewayId,
          originalError: vnpResponse
        });
      }

      if (vnpResponse.vnp_ResponseCode === '07') {
        throw new FraudDetectedException(vnpResponse.vnp_Message || 'Giao dịch nghi ngờ gian lận', {
          gatewayType: this.gatewayId,
          originalError: vnpResponse
        });
      }

      const isSuccess = vnpResponse.vnp_ResponseCode === '00';

      const normalizedResult = new UnifiedPaymentResult({
        transactionId: `TXN_OMNI_${Date.now()}`,
        orderId: request.orderId,
        gatewayType: this.gatewayId,
        status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.DECLINED,
        amount: request.amount,
        currency: request.currency,
        providerTransactionId: vnpResponse.vnp_TransactionNo || vnpResponse.vnp_TxnRef,
        rawProviderResponse: vnpResponse,
        transformationLogs
      });

      transformationLogs.push({
        step: '5_NORMALIZE_RESPONSE',
        detail: `Dịch mã vnp_ResponseCode "${vnpResponse.vnp_ResponseCode}" -> Trạng thái ${normalizedResult.status}`,
        status: normalizedResult.status,
        providerTxnId: normalizedResult.providerTransactionId
      });

      return normalizedResult;
    } catch (err) {
      if (err instanceof InsufficientFundsException || err instanceof FraudDetectedException) {
        throw err;
      }
      throw new PaymentGatewayException(err.message || 'Lỗi xử lý cổng VNPay', {
        gatewayType: this.gatewayId,
        originalError: err
      });
    }
  }

  async processRefund(request) {
    const vnpRefund = await this.vnpayClient.refundTransaction({
      vnp_TxnRef: request.providerTransactionId,
      vnp_Amount: request.amount * (request.currency === 'USD' ? this.exchangeRateUsdToVnd : 1) * 100
    });

    return new UnifiedRefundResult({
      refundId: `REFUND_OMNI_${Date.now()}`,
      transactionId: request.transactionId,
      providerRefundId: vnpRefund.vnp_RefundNo,
      gatewayType: this.gatewayId,
      status: vnpRefund.vnp_ResponseCode === '00' ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
      amount: request.amount,
      currency: request.currency,
      rawProviderResponse: vnpRefund
    });
  }

  async verifyWebhook(rawPayload, headers) {
    return {
      eventType: 'vnpay.ipn.payment_received',
      providerEventId: rawPayload.vnp_TransactionNo || `vnp_ipn_${Date.now()}`,
      gatewayType: this.gatewayId,
      data: rawPayload
    };
  }

  async checkHealth() {
    return {
      gatewayId: this.gatewayId,
      status: 'UP',
      latencyMs: 32,
      version: 'v2.1.0-IPN'
    };
  }
}

module.exports = VNPayAdapter;
