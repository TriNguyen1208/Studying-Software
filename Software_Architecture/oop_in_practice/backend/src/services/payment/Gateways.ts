/**
 * services/payment/Gateways.ts - Các Lớp Thực Thi Cụ Thể (Polymorphic Implementations)
 * 
 * 💡 TÍNH ĐA HÌNH (POLYMORPHISM):
 * - Ba lớp StripeGateway, VnPayGateway, MoMoGateway đều kế thừa và hiện thực hóa interface IPaymentGateway.
 * - Mỗi lớp có thuật toán tính phí, quy trình tạo chữ ký và giao thức gọi mạng hoàn toàn khác nhau.
 * - Tuy nhiên, đối với người gọi (Consumer), họ chỉ cần gọi: gateway.charge(...) mà không cần quan tâm
 *   đối tượng cụ thể đằng sau là ai!
 */

import { IPaymentGateway, PaymentResult } from './IPaymentGateway';

export class StripeGateway implements IPaymentGateway {
  public readonly name = 'Stripe (Thẻ Tín Dụng Quốc Tế Visa/Mastercard)';

  async charge(amount: number, currency: string, description: string): Promise<PaymentResult> {
    // Thuật toán tính phí Stripe: 2.9% + $0.30 cố định
    const fee = Math.round((amount * 0.029 + 0.3) * 100) / 100;
    const txnId = `ch_stripe_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.log(`[STRIPE LOG] Đang xác thực thẻ tín dụng 3D-Secure, trừ tiền: $${amount} ${currency}, Phí dịch vụ: $${fee}`);

    return {
      success: true,
      transactionId: txnId,
      gatewayName: this.name,
      amountCharged: amount,
      fee,
      message: `Thanh toán qua Stripe thành công. Mã ủy quyền: ${txnId}`,
      timestamp: new Date().toISOString()
    };
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    console.log(`[STRIPE REFUND] Đang hoàn tiền $${amount} cho giao dịch ${transactionId}`);
    return true;
  }
}

export class VnPayGateway implements IPaymentGateway {
  public readonly name = 'VNPay (Cổng Thanh Toán Quốc Gia ATM / Internet Banking)';

  async charge(amount: number, currency: string, description: string): Promise<PaymentResult> {
    // Thuật toán tính phí VNPay: 1.1%
    const fee = Math.round((amount * 0.011) * 100) / 100;
    const txnId = `vnpay_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    console.log(`[VNPAY LOG] Tạo chuỗi ký HMAC-SHA512 checksum, chuyển tiếp cổng ngân hàng Việt Nam, Trừ tiền: $${amount}`);

    return {
      success: true,
      transactionId: txnId,
      gatewayName: this.name,
      amountCharged: amount,
      fee,
      message: `Thanh toán qua cổng VNPay-QR thành công! Mã giao dịch: ${txnId}`,
      timestamp: new Date().toISOString()
    };
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    console.log(`[VNPAY REFUND] Đang gửi yêu cầu hủy giao dịch ${transactionId} qua VNPay`);
    return true;
  }
}

export class MoMoGateway implements IPaymentGateway {
  public readonly name = 'Ví Điện Tử MoMo (E-Wallet Smart QR)';

  async charge(amount: number, currency: string, description: string): Promise<PaymentResult> {
    // Thuật toán tính phí MoMo: 1.5%
    const fee = Math.round((amount * 0.015) * 100) / 100;
    const txnId = `momo_pay_${Date.now()}_app`;

    console.log(`[MOMO LOG] Mở ứng dụng MoMo, quét Dynamic QR Code, trừ ví: $${amount}`);

    return {
      success: true,
      transactionId: txnId,
      gatewayName: this.name,
      amountCharged: amount,
      fee,
      message: `Trừ tiền ví điện tử MoMo thành công!`,
      timestamp: new Date().toISOString()
    };
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    console.log(`[MOMO REFUND] Đang hoàn tiền ví MoMo giao dịch ${transactionId}`);
    return true;
  }
}

/**
 * PaymentGatewayFactory - Factory Pattern kết hợp Tính Đa Hình
 * Khởi tạo đối tượng phù hợp theo tham số truyền vào (Stripe / VNPay / MoMo)
 */
export class PaymentGatewayFactory {
  public static create(type: string): IPaymentGateway {
    switch (type.toLowerCase()) {
      case 'stripe':
        return new StripeGateway();
      case 'vnpay':
        return new VnPayGateway();
      case 'momo':
        return new MoMoGateway();
      default:
        throw new Error(`Cổng thanh toán "${type}" không được hệ thống hỗ trợ!`);
    }
  }
}
