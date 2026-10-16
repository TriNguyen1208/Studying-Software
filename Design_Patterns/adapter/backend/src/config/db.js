/**
 * DATABASE CONFIGURATION & CONNECTION POOLING
 * 
 * Tại sao cần Connection Pool trong Production?
 * - Tạo một TCP socket connection mới đến Database tốn kém cả về thời gian (TCP handshake, SSL negotiation, Auth)
 *   và tài nguyên RAM/CPU của Database server.
 * - Pool duy trì sẵn một tập hợp kết nối tái sử dụng, giúp giảm đáng kể latency mỗi request.
 * - Có cơ chế tự động Reconnect và Graceful Fallback nếu Database chưa sẵn sàng.
 */

const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_NAME || 'omnipay_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'omnipay_secure_password',
  max: 20, // Số kết nối tối đa trong pool
  idleTimeoutMillis: 30000, // Đóng kết nối nhàn rỗi sau 30s
  connectionTimeoutMillis: 2000, // Timeout nếu không lấy được connection sau 2s
};

let pool = null;
let isConnected = false;

// Bộ nhớ in-memory fallback phòng khi user chạy ứng dụng mà chưa bật Docker Postgres
const memoryStore = {
  transactions: [],
  auditLogs: []
};

async function initDatabase() {
  try {
    pool = new Pool(poolConfig);
    
    // Kiểm tra kết nối
    const client = await pool.connect();
    isConnected = true;
    console.log(`[PostgreSQL] Đã kết nối thành công tới Database: ${poolConfig.database} trên cổng ${poolConfig.port}`);
    client.release();

    // Tự động tạo bảng nếu chưa có
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        idempotency_key VARCHAR(128) UNIQUE,
        gateway_type VARCHAR(32) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        currency VARCHAR(8) NOT NULL,
        status VARCHAR(32) NOT NULL,
        provider_txn_id VARCHAR(128),
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        transaction_id VARCHAR(64),
        gateway_type VARCHAR(32) NOT NULL,
        action VARCHAR(64) NOT NULL,
        input_payload JSONB,
        transformation_steps JSONB,
        raw_provider_request JSONB,
        raw_provider_response JSONB,
        normalized_output JSONB,
        duration_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[PostgreSQL] Các bảng nghiệp vụ đã sẵn sàng (transactions, audit_logs).');
  } catch (err) {
    console.warn(`[PostgreSQL Warning] Không thể kết nối Postgres (${err.message}). Tự động kích hoạt In-Memory Store để bảo đảm ứng dụng vẫn chạy mượt mà không crash.`);
    isConnected = false;
  }
}

async function query(text, params) {
  if (isConnected && pool) {
    return pool.query(text, params);
  }
  return null;
}

function getMemoryStore() {
  return memoryStore;
}

function isDbConnected() {
  return isConnected;
}

async function closePool() {
  if (pool) {
    console.log('[PostgreSQL] Đang giải phóng kết nối Connection Pool...');
    await pool.end();
  }
}

module.exports = {
  initDatabase,
  query,
  getMemoryStore,
  isDbConnected,
  closePool
};
