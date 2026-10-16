/**
 * TARGET INTERFACE (PORT) TRONG HEXAGONAL ARCHITECTURE
 * 
 * Đây là "Hợp đồng trừu tượng" (Abstract Contract) mà hệ thống cốt lõi (Core Business Domain)
 * đặt ra cho tất cả các cổng thanh toán.
 * 
 * BẢN CHẤT KIẾN TRÚC:
 * - Domain Core KHÔNG ĐƯỢC PHÉP biết Stripe, PayPal, VNPay hay Core Banking XML là ai.
 * - Domain Core CHỈ NÓI CHUYỆN với Interface này.
 * - Mọi Adapter (StripeAdapter, PayPalAdapter, VNPayAdapter, LegacyBankXmlAdapter)
 *   BẮT BUỘC phải cài đặt (implement) đầy đủ các phương thức được định nghĩa dưới đây.
 */

class IPaymentGateway {
  /**
   * Tên định danh của Gateway (stripe | paypal | vnpay | legacy_bank_xml)
   */
  get gatewayId() {
    throw new Error("Method 'gatewayId' must be implemented.");
  }

  /**
   * Xử lý giao dịch thanh toán
   * @param {UnifiedPaymentRequest} request - Dữ liệu yêu cầu chuẩn của Domain
   * @returns {Promise<UnifiedPaymentResult>} - Kết quả giao dịch đã được chuẩn hóa
   */
  async processPayment(request) {
    throw new Error("Method 'processPayment' must be implemented.");
  }

  /**
   * Xử lý hoàn tiền (Refund)
   * @param {UnifiedRefundRequest} request - Dữ liệu yêu cầu hoàn tiền chuẩn
   * @returns {Promise<UnifiedRefundResult>} - Kết quả hoàn tiền đã được chuẩn hóa
   */
  async processRefund(request) {
    throw new Error("Method 'processRefund' must be implemented.");
  }

  /**
   * Xác thực chữ ký và giải mã Webhook / IPN từ phía bên thứ 3
   * @param {Object} rawPayload - Body thô nhận từ 3rd-party webhook
   * @param {Object} headers - HTTP Headers kèm chữ ký bảo mật
   * @returns {Promise<UnifiedWebhookEvent>} - Sự kiện webhook đã chuẩn hóa
   */
  async verifyWebhook(rawPayload, headers) {
    throw new Error("Method 'verifyWebhook' must be implemented.");
  }

  /**
   * Kiểm tra tình trạng kết nối và tính sẵn sàng của Gateway (Health check)
   * @returns {Promise<GatewayHealthResult>}
   */
  async checkHealth() {
    throw new Error("Method 'checkHealth' must be implemented.");
  }
}

module.exports = IPaymentGateway;
