/**
 * database/connection.ts - Quản Lý Kết Nối & Migration SQLite
 * 
 * 💡 BẢN CHẤT KIẾN TRÚC:
 * - SQLite là cơ sở dữ liệu nhúng (Embedded Database), lưu trữ toàn bộ dữ liệu vào một file duy nhất trên đĩa: `database.sqlite`.
 * - WAL Mode (Write-Ahead Logging): Cho phép Đọc (Read) và Ghi (Write) diễn ra đồng thời mà không bị khóa (non-blocking readers).
 * - QUAN TRỌNG: Khi server khởi động, file này CHỈ MỞ KẾT NỐI VÀ TẠO BẢNG, tuyệt đối KHÔNG nạp dữ liệu vào RAM!
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../../database.sqlite');

export class DatabaseManager {
  private static instance: Database.Database | null = null;

  // Singleton Pattern: Đảm bảo duy nhất 1 kết nối tới file database.sqlite trong suốt vòng đời của process
  public static getInstance(): Database.Database {
    if (!this.instance) {
      this.instance = new Database(DB_PATH, {
        verbose: process.env.NODE_ENV === 'development' ? undefined : undefined
      });

      // Bật chế độ WAL (Write-Ahead Logging) để tăng tốc độ I/O đĩa
      this.instance.pragma('journal_mode = WAL');
      // Bật kiểm tra khóa ngoại (Foreign Keys)
      this.instance.pragma('foreign_keys = ON');

      this.initializeSchema(this.instance);
    }
    return this.instance;
  }

  // Khởi tạo bảng nếu chưa tồn tại (Schema Migration)
  private static initializeSchema(db: Database.Database): void {
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        account_number TEXT UNIQUE NOT NULL,
        owner_name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | FROZEN | CLOSED
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL, -- DEPOSIT | WITHDRAW | TRANSFER_IN | TRANSFER_OUT | PAYMENT
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `;

    db.exec(createTablesSQL);
    this.seedInitialData(db);
  }

  // Nạp dữ liệu mẫu ban đầu nếu bảng đang rỗng
  private static seedInitialData(db: Database.Database): void {
    const rowCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
    
    if (rowCount.count === 0) {
      console.log('🌱 Khởi tạo dữ liệu mẫu ngân hàng vào database.sqlite...');
      const insertAccount = db.prepare(`
        INSERT INTO accounts (id, account_number, owner_name, balance, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      insertAccount.run('acc-1', '10019988', 'Nguyễn Văn An (VIP)', 5000.0, 'ACTIVE', now);
      insertAccount.run('acc-2', '10028877', 'Trần Thị Bình (Standard)', 1200.0, 'ACTIVE', now);
      insertAccount.run('acc-3', '10037766', 'Lê Hoàng Cường (Tài khoản Đóng Băng)', 300.0, 'FROZEN', now);

      console.log('✅ Đã khởi tạo xong 3 tài khoản ngân hàng mẫu trong SQLite.');
    }
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      console.log('Đã đóng kết nối SQLite an toàn.');
    }
  }
}
