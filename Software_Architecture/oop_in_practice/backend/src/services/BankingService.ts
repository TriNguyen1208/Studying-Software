/**
 * services/BankingService.ts - Tầng Điều Phối Nghiệp Vụ Ứng Dụng (Application Service)
 * 
 * 💡 KIẾN TRÚC DOANH NGHIỆP:
 * - Service KHÔNG chứa luật nghiệp vụ (luật nghiệp vụ đã nằm trong Class BankAccount).
 * - Service đóng vai trò là "Tổng Đạo Diễn":
 *   1. Gọi Repository nạp dữ liệu từ SQLite thành Object OOP.
 *   2. Ra lệnh cho Object OOP tự xử lý (`account.withdraw`, `account.transferTo`).
 *   3. Gọi Repository lưu trạng thái mới xuống SQLite.
 *   4. Gọi các dịch vụ đa hình bên ngoài (Payment Gateway).
 */

import { IBankAccountRepository } from '../repositories/SqliteBankAccountRepository';
import { PaymentGatewayFactory } from './payment/Gateways';
import { PaymentResult } from './payment/IPaymentGateway';
import { Transaction } from '../domain/Transaction';

export class BankingService {
  constructor(private readonly accountRepo: IBankAccountRepository) {}

  // 1. Lấy danh sách tất cả tài khoản
  public listAccounts() {
    return this.accountRepo.findAll().map(acc => ({
      id: acc.id,
      accountNumber: acc.accountNumber,
      ownerName: acc.ownerName,
      balance: acc.balance,
      status: acc.status,
      createdAt: acc.createdAt
    }));
  }

  // 2. Nạp tiền vào tài khoản
  public deposit(accountId: string, amount: number, description?: string): { balance: number; tx: Transaction } {
    return this.accountRepo.executeInTransaction(() => {
      const account = this.accountRepo.findById(accountId);
      if (!account) {
        throw new Error(`Không tìm thấy tài khoản với mã "${accountId}".`);
      }

      // Gọi phương thức đóng gói của Class
      const tx = account.deposit(amount, description);

      // Lưu ngược lại SQLite
      this.accountRepo.save(account);
      this.accountRepo.saveTransaction(tx);

      return { balance: account.balance, tx };
    });
  }

  // 3. Rút tiền khỏi tài khoản (Kiểm tra luật đóng gói trong Class)
  public withdraw(accountId: string, amount: number, description?: string): { balance: number; tx: Transaction } {
    return this.accountRepo.executeInTransaction(() => {
      const account = this.accountRepo.findById(accountId);
      if (!account) {
        throw new Error(`Không tìm thấy tài khoản với mã "${accountId}".`);
      }

      // Gọi phương thức đóng gói của Class (tự động ném InsufficientFundsError nếu số dư thiếu)
      const tx = account.withdraw(amount, description);

      this.accountRepo.save(account);
      this.accountRepo.saveTransaction(tx);

      return { balance: account.balance, tx };
    });
  }

  // 4. Chuyển khoản giữa 2 tài khoản ngân hàng (ACID Transaction)
  public transfer(sourceAccountId: string, targetAccountNumber: string, amount: number, description?: string) {
    return this.accountRepo.executeInTransaction(() => {
      const sourceAccount = this.accountRepo.findById(sourceAccountId);
      if (!sourceAccount) {
        throw new Error(`Tài khoản chuyển tiền không tồn tại.`);
      }

      const targetAccount = this.accountRepo.findByAccountNumber(targetAccountNumber);
      if (!targetAccount) {
        throw new Error(`Tài khoản nhận tiền số "${targetAccountNumber}" không tồn tại trong hệ thống!`);
      }

      // Thực thể BankAccount tự động xử lý chuyển khoản hai chiều
      const { debitTx, creditTx } = sourceAccount.transferTo(targetAccount, amount, description);

      // Lưu cập nhật cả 2 tài khoản và 2 giao dịch xuống SQLite trong cùng 1 Transaction
      this.accountRepo.save(sourceAccount);
      this.accountRepo.save(targetAccount);
      this.accountRepo.saveTransaction(debitTx);
      this.accountRepo.saveTransaction(creditTx);

      return {
        sourceAccount: { id: sourceAccount.id, balance: sourceAccount.balance },
        targetAccount: { id: targetAccount.id, balance: targetAccount.balance },
        debitTx,
        creditTx
      };
    });
  }

  // 5. Thanh toán dịch vụ qua Đa Cổng Thanh Toán (Áp dụng Tính Đa Hình)
  public async payViaGateway(
    accountId: string,
    amount: number,
    gatewayType: string,
    itemDescription: string
  ): Promise<{ paymentResult: PaymentResult; balance: number; tx: Transaction }> {
    // A. Khởi tạo đối tượng Cổng Thanh Toán cụ thể bằng Factory (Tính Đa Hình)
    const gateway = PaymentGatewayFactory.create(gatewayType);

    // B. Gọi phương thức charge() đa hình (không cần biết bên trong là Stripe, VNPay hay MoMo)
    const paymentResult = await gateway.charge(amount, "USD", itemDescription);

    // C. Trừ tiền tài khoản ngân hàng tương ứng với tổng tiền + phí giao dịch
    const totalDeduction = paymentResult.amountCharged + paymentResult.fee;

    const result = this.accountRepo.executeInTransaction(() => {
      const account = this.accountRepo.findById(accountId);
      if (!account) {
        throw new Error(`Tài khoản ngân hàng không tồn tại.`);
      }

      const tx = account.withdraw(
        totalDeduction,
        `Thanh toán đơn hàng qua ${gateway.name} (Phí: $${paymentResult.fee})`
      );

      this.accountRepo.save(account);
      this.accountRepo.saveTransaction(tx);

      return {
        paymentResult,
        balance: account.balance,
        tx
      };
    });

    return result;
  }

  // 6. Đổi trạng thái tài khoản (Khóa / Mở Khóa)
  public toggleAccountStatus(accountId: string) {
    return this.accountRepo.executeInTransaction(() => {
      const account = this.accountRepo.findById(accountId);
      if (!account) throw new Error("Không tìm thấy tài khoản.");

      if (account.status === 'ACTIVE') {
        account.freeze();
      } else {
        account.unfreeze();
      }

      this.accountRepo.save(account);
      return { id: account.id, status: account.status };
    });
  }
}
