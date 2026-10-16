/**
 * repositories/SqliteBankAccountRepository.ts - Cầu Nối Giữa OOP Class & SQLite Database
 * 
 * 💡 ĐÂY CHÍNH LÀ LỜI GIẢI CHO CÂU HỎI:
 * "Dữ liệu lưu ở Database, vậy khi start server có load hết vào class không?"
 * 
 * 👉 CÂU TRẢ LỜI ĐƯỢC CODE CHỨNG MINH RÕ RÀNG TẠI ĐÂY:
 * 1. Khi server bật lên: Repository chỉ kết nối tới file database.sqlite. HOÀN TOÀN KHÔNG LOAD DỮ LIỆU.
 * 2. Khi có request cần xử lý (ví dụ: chuyển tiền tài khoản A sang B):
 *    - Repository thực thi câu lệnh SQL: SELECT * FROM accounts WHERE id = ?
 *    - Lấy đúng 1 dòng dữ liệu thô từ đĩa cứng lên.
 *    - Nạp dòng đó vào `BankAccount.reconstitute(...)` -> Một đối tượng Class OOP được sinh ra trên RAM.
 * 3. Class thực hiện các hàm nghiệp vụ (rút tiền, kiểm tra số dư, trừ tiền).
 * 4. Repository thực thi câu lệnh SQL: UPDATE accounts SET balance = ? WHERE id = ?
 *    - Dữ liệu được ghi bền vững xuống file database.sqlite.
 * 5. Kết thúc request: Biến account trong hàm kết thúc vòng đời, bộ dọn rác V8 Garbage Collector
 *    lập tức thu hồi RAM! Không có dữ liệu nào bị giữ mãi trong RAM gây tràn bộ nhớ.
 */

import Database from 'better-sqlite3';
import { BankAccount } from '../domain/BankAccount';
import { Transaction } from '../domain/Transaction';

export interface IBankAccountRepository {
  findById(id: string): BankAccount | null;
  findByAccountNumber(accountNumber: string): BankAccount | null;
  findAll(): BankAccount[];
  save(account: BankAccount): void;
  saveTransaction(transaction: Transaction): void;
  executeInTransaction<T>(work: () => T): T;
}

export class SqliteBankAccountRepository implements IBankAccountRepository {
  constructor(private readonly db: Database.Database) {}

  // 1. Tìm 1 tài khoản theo ID -> Nạp vào Class OOP
  public findById(id: string): BankAccount | null {
    const stmt = this.db.prepare(`
      SELECT id, account_number, owner_name, balance, status, created_at 
      FROM accounts 
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    // HYDRATION: Nạp dữ liệu thô từ đĩa vào một instance Class mới
    return BankAccount.reconstitute(row);
  }

  // 2. Tìm theo số tài khoản
  public findByAccountNumber(accountNumber: string): BankAccount | null {
    const stmt = this.db.prepare(`
      SELECT id, account_number, owner_name, balance, status, created_at 
      FROM accounts 
      WHERE account_number = ?
    `);

    const row = stmt.get(accountNumber) as any;
    if (!row) return null;

    return BankAccount.reconstitute(row);
  }

  // 3. Lấy toàn bộ danh sách tài khoản (để hiển thị bảng Dashboard)
  public findAll(): BankAccount[] {
    const stmt = this.db.prepare(`
      SELECT id, account_number, owner_name, balance, status, created_at 
      FROM accounts 
      ORDER BY created_at ASC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => BankAccount.reconstitute(row));
  }

  // 4. Lưu trạng thái của Class xuống file SQLite trên đĩa cứng
  public save(account: BankAccount): void {
    const stmt = this.db.prepare(`
      UPDATE accounts 
      SET balance = ?, status = ?
      WHERE id = ?
    `);

    stmt.run(account.balance, account.status, account.id);
  }

  // 5. Ghi lịch sử giao dịch vào bảng transactions
  public saveTransaction(tx: Transaction): void {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, account_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(tx.id, tx.accountId, tx.type, tx.amount, tx.balanceAfter, tx.description, tx.createdAt);
  }

  // 6. Thực thi giao dịch nguyên tử (ACID Transaction trong SQLite)
  public executeInTransaction<T>(work: () => T): T {
    const transactionWrapper = this.db.transaction(work);
    return transactionWrapper();
  }

  // Phương thức phụ trợ: Lấy raw rows từ SQLite để phục vụ giao diện Database Inspector
  public getRawDatabaseState(): { accounts: any[]; transactions: any[] } {
    const accounts = this.db.prepare('SELECT * FROM accounts').all();
    const transactions = this.db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20').all();
    return { accounts, transactions };
  }
}
