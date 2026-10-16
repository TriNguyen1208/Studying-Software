/**
 * services/payment/IPaymentGateway.ts - Hợp Đồng Trừu Tượng (Abstraction)
 * 
 * 💡 TÍNH TRỪU TƯỢNG (ABSTRACTION) & ĐA HÌNH (POLYMORPHISM):
 * - Định nghĩa Interface (hợp đồng) chung cho mọi cổng thanh toán.
 * - Bất kỳ bên thứ ba nào (Stripe, VNPay, MoMo, PayPal) chỉ cần tuân thủ giao ước này là có thể cắm vào hệ thống (Pluggable)
 *   mà không bắt buộc tầng Core Banking phải viết hàng loạt câu lệnh if/else.
 */

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  gatewayName: string;
  amountCharged: number;
  fee: number;
  message: string;
  timestamp: string;
}

export interface IPaymentGateway {
  readonly name: string;
  charge(amount: number, currency: string, description: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<boolean>;
}
