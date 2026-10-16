const { Pool } = require('pg');
require('dotenv').config();

// Cấu hình Connection Pool cho PostgreSQL chuẩn Production
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'idempotency_secure_password',
  database: process.env.DB_NAME || 'idempotency_db',
  max: 20, // Số lượng connection tối đa trong pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error] Lỗi kết nối đột ngột:', err.message);
});

// Hàm khởi tạo database schema tự động khi boot server
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Bảng tài khoản người dùng (Accounts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_number VARCHAR(32) PRIMARY KEY,
        holder_name VARCHAR(100) NOT NULL,
        balance NUMERIC(12, 2) NOT NULL CHECK (balance >= 0),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Bảng lịch sử giao dịch (Transactions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY,
        from_account VARCHAR(32) REFERENCES accounts(account_number),
        to_account VARCHAR(32) REFERENCES accounts(account_number),
        amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
        reason TEXT,
        idempotency_key VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Bảng lưu trữ trạng thái Idempotency Key lâu dài (Durable Idempotency Store)
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(128) PRIMARY KEY,
        request_hash VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL, -- 'IN_PROGRESS', 'COMPLETED', 'FAILED'
        response_code INT,
        response_body JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Tạo Index tối ưu hóa truy vấn tìm kiếm nhanh
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_idemp_key ON transactions(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_idemp_keys_status ON idempotency_keys(status);
    `);

    await client.query('COMMIT');
    console.log('[PostgreSQL] Khởi tạo schema cơ sở dữ liệu thành công!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Khởi tạo schema thất bại:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
};
