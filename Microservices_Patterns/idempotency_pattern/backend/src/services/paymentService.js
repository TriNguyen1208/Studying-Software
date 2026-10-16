const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const redis = require('../config/redis');

/**
 * Service xử lý giao dịch chuyển tiền ngân hàng / ví điện tử.
 * Sử dụng ACID Transaction kết hợp Row-Level Locking (SELECT ... FOR UPDATE) để chống Race Condition tầng DB.
 */
class PaymentService {
  /**
   * Thực thi lệnh chuyển khoản giữa 2 tài khoản
   */
  async executeTransfer({ fromAccount, toAccount, amount, reason, delayMs = 600, idempotencyKey = null }) {
    if (fromAccount === toAccount) {
      throw { status: 400, message: 'Tài khoản nguồn và tài khoản đích không được trùng nhau.' };
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      throw { status: 400, message: 'Số tiền chuyển khoản phải là số dương lớn hơn 0.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Khóa dòng (Row Lock) của tài khoản nguồn để ngăn chặn việc rút quá số dư đồng thời
      const senderRes = await client.query(
        'SELECT account_number, holder_name, balance FROM accounts WHERE account_number = $1 FOR UPDATE',
        [fromAccount]
      );

      if (senderRes.rows.length === 0) {
        throw { status: 404, message: `Không tìm thấy tài khoản người gửi: ${fromAccount}` };
      }

      const sender = senderRes.rows[0];
      const currentBalance = parseFloat(sender.balance);

      if (currentBalance < transferAmount) {
        throw {
          status: 400,
          message: `Số dư khả dụng không đủ. Hiện có: $${currentBalance.toFixed(2)}, Cần: $${transferAmount.toFixed(2)}`,
        };
      }

      // 2. Kiểm tra tài khoản nhận
      const receiverRes = await client.query(
        'SELECT account_number, holder_name, balance FROM accounts WHERE account_number = $1 FOR UPDATE',
        [toAccount]
      );

      if (receiverRes.rows.length === 0) {
        throw { status: 404, message: `Không tìm thấy tài khoản người nhận: ${toAccount}` };
      }

      // Mô phỏng độ trễ xử lý nghiệp vụ thực tế (Core Banking / External Clearing)
      // Giúp người dùng quan sát rõ Race Condition khi spam concurrent requests
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // 3. Trừ tiền người gửi
      const newSenderBalance = currentBalance - transferAmount;
      await client.query(
        'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
        [newSenderBalance, fromAccount]
      );

      // 4. Cộng tiền người nhận
      const receiver = receiverRes.rows[0];
      const newReceiverBalance = parseFloat(receiver.balance) + transferAmount;
      await client.query(
        'UPDATE accounts SET balance = $1, updated_at = NOW() WHERE account_number = $2',
        [newReceiverBalance, toAccount]
      );

      // 5. Ghi log giao dịch vào sổ cái (Ledger)
      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO transactions (id, from_account, to_account, amount, reason, idempotency_key, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [transactionId, fromAccount, toAccount, transferAmount, reason || 'Chuyển tiền nhanh', idempotencyKey]
      );

      await client.query('COMMIT');

      return {
        success: true,
        transactionId,
        fromAccount,
        toAccount,
        amount: transferAmount,
        senderRemainingBalance: newSenderBalance,
        reason: reason || 'Chuyển tiền nhanh',
        executedAt: new Date().toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lấy danh sách tài khoản
   */
  async getAccounts() {
    const res = await pool.query('SELECT * FROM accounts ORDER BY account_number ASC');
    return res.rows;
  }

  /**
   * Lấy danh sách giao dịch gần nhất
   */
  async getTransactions(limit = 20) {
    const res = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows;
  }

  /**
   * Lấy danh sách Idempotency Records và khóa đang chạy
   */
  async getIdempotencyRecords() {
    const dbRecords = await pool.query(
      'SELECT key, request_hash, status, response_code, created_at, locked_at, completed_at FROM idempotency_keys ORDER BY created_at DESC LIMIT 30'
    );

    // Lấy thêm các key đang giữ lock trong Redis
    const lockKeys = await redis.keys('idemp:lock:*');
    const activeLocks = [];

    for (const lk of lockKeys) {
      const ttl = await redis.pttl(lk);
      const val = await redis.get(lk);
      activeLocks.push({
        lockKey: lk,
        idempotencyKey: lk.replace('idemp:lock:', ''),
        owner: val,
        ttlMsRemaining: ttl,
      });
    }

    return {
      records: dbRecords.rows,
      activeLocks,
    };
  }

  /**
   * Khôi phục cơ sở dữ liệu về trạng thái mẫu ban đầu
   */
  async resetDatabase() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE transactions CASCADE');
      await client.query('TRUNCATE TABLE idempotency_keys CASCADE');

      // Đặt lại số dư mặc định: Alice $1,000.00, Bob $100.00
      await client.query(`
        INSERT INTO accounts (account_number, holder_name, balance, updated_at)
        VALUES 
          ('ACC-1001', 'Alice Johnson (Sender)', 1000.00, NOW()),
          ('ACC-2002', 'Bob Smith (Receiver)', 100.00, NOW())
        ON CONFLICT (account_number) DO UPDATE
        SET balance = EXCLUDED.balance, updated_at = NOW();
      `);

      await client.query('COMMIT');

      // Xóa toàn bộ key trong Redis
      await redis.flushdb();

      return {
        message: 'Khôi phục dữ liệu ban đầu thành công! Alice: $1000.00, Bob: $100.00, Idempotency Store đã dọn sạch.',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new PaymentService();
