/**
 * domain/BankAccount.ts - Thực Thể Tài Khoản Ngân Hàng (Domain Entity)
 * 
 * 💡 TÍNH ĐÓNG GÓI (ENCAPSULATION):
 * - Dữ liệu số dư (#balance) và trạng thái (#status) được ĐẶT RIÊNG TƯ (Private Fields).
 * - Bên ngoài TUYỆT ĐỐI không thể gán: account.balance = -999999.
 * - Mọi sự thay đổi trạng thái bắt buộc phải thông qua các phương thức nghiệp vụ:
 *   deposit(), withdraw(), transferTo(), freeze().
 * - Các luật bảo vệ (Invariants) được thực thi ngay tại đây. Nếu có sai phạm, ném Domain Exception ngay lập tức!
 */

import { InsufficientFundsError, AccountFrozenError, InvalidAmountError } from './errors/DomainErrors';
import { Transaction } from './Transaction';

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export class BankAccount {
  private readonly _id: string;
  private readonly _accountNumber: string;
  private readonly _ownerName: string;
  private _balance: number;
  private _status: AccountStatus;
  private readonly _createdAt: string;

  constructor(
    id: string,
    accountNumber: string,
    ownerName: string,
    initialBalance: number = 0,
    status: AccountStatus = 'ACTIVE',
    createdAt?: string
  ) {
    if (initialBalance < 0) {
      throw new InvalidAmountError(initialBalance);
    }

    this._id = id;
    this._accountNumber = accountNumber;
    this._ownerName = ownerName;
    this._balance = initialBalance;
    this._status = status;
    this._createdAt = createdAt || new Date().toISOString();
  }

  // Getters công khai: Cho phép bên ngoài đọc dữ liệu nhưng KHÔNG cho phép gán trực tiếp
  public get id(): string { return this._id; }
  public get accountNumber(): string { return this._accountNumber; }
  public get ownerName(): string { return this._ownerName; }
  public get balance(): number { return this._balance; }
  public get status(): AccountStatus { return this._status; }
  public get createdAt(): string { return this._createdAt; }

  // 1. Nghiệp vụ Nạp Tiền (Deposit)
  public deposit(amount: number, description: string = "Nạp tiền vào tài khoản"): Transaction {
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    this._balance += amount;

    return Transaction.create(
      this._id,
      'DEPOSIT',
      amount,
      this._balance,
      description
    );
  }

  // 2. Nghiệp vụ Rút Tiền (Withdraw) - Đóng gói luật kiểm tra số dư & trạng thái
  public withdraw(amount: number, description: string = "Rút tiền khỏi tài khoản"): Transaction {
    if (amount <= 0) {
      throw new InvalidAmountError(amount);
    }

    if (this._status === 'FROZEN') {
      throw new AccountFrozenError(this._accountNumber);
    }

    if (this._balance < amount) {
      throw new InsufficientFundsError(this._balance, amount);
    }

    this._balance -= amount;

    return Transaction.create(
      this._id,
      'WITHDRAW',
      amount,
      this._balance,
      description
    );
  }

  // 3. Nghiệp vụ Chuyển Khoản (Transfer to another BankAccount)
  public transferTo(
    targetAccount: BankAccount,
    amount: number,
    description: string = "Chuyển khoản liên ngân hàng"
  ): { debitTx: Transaction; creditTx: Transaction } {
    if (this._id === targetAccount.id) {
      throw new Error("Không thể tự chuyển tiền cho chính tài khoản của mình!");
    }

    // Thực hiện rút tiền từ tài khoản nguồn (tự động kiểm tra số dư & trạng thái)
    const debitTx = this.withdraw(amount, `${description} tới ${targetAccount.ownerName} (${targetAccount.accountNumber})`);
    
    // Nạp tiền vào tài khoản thụ hưởng
    const creditTx = targetAccount.deposit(amount, `${description} từ ${this._ownerName} (${this._accountNumber})`);

    return { debitTx, creditTx };
  }

  // 4. Nghiệp vụ Khóa / Mở Khóa tài khoản
  public freeze(): void {
    this._status = 'FROZEN';
  }

  public unfreeze(): void {
    this._status = 'ACTIVE';
  }

  // Factory Method: Tái tạo thực thể từ dòng dữ liệu thô trong SQLite (Hydration)
  public static reconstitute(rawRow: {
    id: string;
    account_number: string;
    owner_name: string;
    balance: number;
    status: string;
    created_at: string;
  }): BankAccount {
    return new BankAccount(
      rawRow.id,
      rawRow.account_number,
      rawRow.owner_name,
      rawRow.balance,
      rawRow.status as AccountStatus,
      rawRow.created_at
    );
  }
}
