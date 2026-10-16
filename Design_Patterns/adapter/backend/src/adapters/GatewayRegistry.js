/**
 * GATEWAY REGISTRY / FACTORY (INVERSION OF CONTROL)
 * 
 * VAI TRÒ:
 * - Đóng vai trò là Registry lưu trữ và phân giải (Resolve) các Adapter tại thời điểm Runtime.
 * - Tuân thủ nguyên lý Open/Closed Principle (OCP): Khi doanh nghiệp muốn thêm cổng thanh toán mới
 *   (ví dụ: Apple Pay, ZaloPay, Crypto/Solana), chỉ cần viết một Adapter mới kế thừa IPaymentGateway
 *   và đăng ký vào Registry này. KHÔNG CẦN SỬA MỘT DÒNG CODE NÀO CỦA CHECKOUT SERVICE!
 */

const StripeAdapter = require('./StripeAdapter');
const PayPalAdapter = require('./PayPalAdapter');
const VNPayAdapter = require('./VNPayAdapter');
const LegacyBankXmlAdapter = require('./LegacyBankXmlAdapter');

class GatewayRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(new StripeAdapter());
    this.register(new PayPalAdapter());
    this.register(new VNPayAdapter());
    this.register(new LegacyBankXmlAdapter());
  }

  register(adapter) {
    if (!adapter.gatewayId) {
      throw new Error('Adapter must provide a valid gatewayId');
    }
    this.adapters.set(adapter.gatewayId, adapter);
    console.log(`[GatewayRegistry] Đã đăng ký thành công Adapter: "${adapter.gatewayId}"`);
  }

  getAdapter(gatewayId) {
    const adapter = this.adapters.get(gatewayId);
    if (!adapter) {
      const available = Array.from(this.adapters.keys()).join(', ');
      throw new Error(`Không tìm thấy Adapter cho cổng "${gatewayId}". Các cổng khả dụng: [${available}]`);
    }
    return adapter;
  }

  listAvailableGateways() {
    return Array.from(this.adapters.keys());
  }
}

// Singleton instance
const registryInstance = new GatewayRegistry();

module.exports = registryInstance;
