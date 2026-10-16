/**
 * domain/errors/BaseDomainError.ts - Lớp Cơ Sở Cho Mọi Lỗi Nghiệp Vụ
 * 
 * 💡 TÍNH KẾ THỪA (INHERITANCE):
 * - Kế thừa từ Error chuẩn của JavaScript.
 * - Mang theo HTTP Status Code tương ứng và đánh dấu `isDomainError = true`.
 * - Tầng Controller chỉ cần kiểm tra `instanceof BaseDomainError` là có thể tự động trả về đúng mã lỗi 400/403/422
 *   mà không cần hàng loạt câu lệnh if/else thủ công.
 */

export abstract class BaseDomainError extends Error {
  public abstract readonly statusCode: number;
  public readonly isDomainError: boolean = true;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Khôi phục prototype chain chuẩn trong TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientFundsError extends BaseDomainError {
  public readonly statusCode = 422; // Unprocessable Entity: Lỗi vi phạm luật nghiệp vụ số dư

  constructor(currentBalance: number, requestedAmount: number) {
    super(`Số dư không đủ! Tài khoản hiện có $${currentBalance.toFixed(2)}, không thể rút/chuyển $${requestedAmount.toFixed(2)}.`);
  }
}

export class AccountFrozenError extends BaseDomainError {
  public readonly statusCode = 403; // Forbidden: Tài khoản bị khóa

  constructor(accountNumber: string) {
    super(`Tài khoản ${accountNumber} đang ở trạng thái BỊ ĐÓNG BĂNG (FROZEN). Mọi giao dịch tiền ra đều bị từ chối!`);
  }
}

export class InvalidAmountError extends BaseDomainError {
  public readonly statusCode = 400; // Bad Request: Dữ liệu đầu vào sai

  constructor(amount: number) {
    super(`Số tiền giao dịch không hợp lệ: $${amount}. Số tiền phải là một giá trị dương lớn hơn 0!`);
  }
}
