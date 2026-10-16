/**
 * DATABASE CONFIGURATION & CONNECTION POOLING (POSTGRESQL)
 * 
 * Tại sao cần Connection Pool trong Production?
 * - Giảm chi phí tạo kết nối TCP và bảo vệ tài nguyên Database Server.
 * - Hỗ trợ tự động Reconnect và Graceful In-Memory Fallback nếu PostgreSQL chưa khởi động.
 */

const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  database: process.env.DB_NAME || 'omnistream_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'omnistream_secure_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let pool = null;
let isConnected = false;

const memoryStore = {
  documents: [],
  auditLogs: []
};

async function initDatabase() {
  try {
    pool = new Pool(poolConfig);
    const client = await pool.connect();
    isConnected = true;
    console.log(`[PostgreSQL] Đã kết nối thành công tới Database: ${poolConfig.database} trên cổng ${poolConfig.port}`);
    client.release();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        payload TEXT NOT NULL,
        is_encrypted BOOLEAN DEFAULT FALSE,
        is_compressed BOOLEAN DEFAULT FALSE,
        original_size_bytes INTEGER,
        stored_size_bytes INTEGER,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(64),
        tenant_id VARCHAR(64) NOT NULL,
        pipeline_stack JSONB NOT NULL,
        layer_traces JSONB NOT NULL,
        total_latency_ms NUMERIC(10, 3) NOT NULL,
        cache_status VARCHAR(16),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[PostgreSQL] Các bảng documents và pipeline_audit_logs đã sẵn sàng.');
  } catch (err) {
    console.warn(`[PostgreSQL Warning] Không thể kết nối Postgres (${err.message}). Kích hoạt In-Memory Store dự phòng.`);
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
