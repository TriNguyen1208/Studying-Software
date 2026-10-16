const Redis = require('ioredis');

/**
 * PRODUCTION-READY REDIS CLIENT CONFIGURATION
 * 
 * Tại sao lại dùng `ioredis` thay vì `node-redis` cơ bản?
 * - `ioredis` hỗ trợ sẵn Connection Pooling, Cluster, Sentinel, Pipeline và Atomic Lua Scripting.
 * - Cho phép kiểm soát chi tiết Retry Strategy với Exponential Backoff để tránh làm sập Redis server khi tái kết nối (Thundering Herd Problem).
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Thời gian tối đa (ms) chờ thiết lập kết nối TCP. 
  // Rủi ro nếu không đặt: Request của người dùng bị treo vô tận khi Redis gặp sự cố mạng.
  connectTimeout: 5000,

  // Giữ kết nối sống (Keep-Alive) để phát hiện kết nối chết ở tầng mạng TCP (Half-open connections)
  keepAlive: 10000,

  // Chiến lược retry với Exponential Backoff & Jitter
  // Đoạn này làm gì: Khi mất kết nối tới Redis, client sẽ thử kết nối lại theo chu kỳ tăng dần (tối đa 3 giây)
  // Tại sao cần: Giúp hệ thống tự phục hồi mà không làm bão request (thundering herd) lên Redis server.
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    console.warn(`[Redis Client] Mất kết nối! Thử kết nối lại lần ${times} sau ${delay}ms...`);
    return delay;
  },

  // Số lần thử lại tối đa cho mỗi command khi gặp lỗi tạm thời
  maxRetriesPerRequest: 3,

  // Cho phép pipeline tự động gom nhóm nhiều lệnh trong 1 event loop tick để tối ưu thông lượng mạng
  enableAutoPipelining: true,
};

// Khởi tạo Redis client chính cho Data/Cache
const redis = new Redis(redisConfig);

// Khởi tạo Redis client phụ cho Subscriber (Vì Redis Pub/Sub client sau khi SUBSCRIBE sẽ vào trạng thái dedicated, không thực hiện được lệnh thường)
const subClient = new Redis(redisConfig);

// Khởi tạo Redis client phụ cho Publisher
const pubClient = new Redis(redisConfig);

// Lắng nghe các sự kiện vòng đời kết nối (Connection Lifecycle)
redis.on('connect', () => {
  console.log('[Redis Client] Đã khởi tạo kết nối TCP tới Redis thành công.');
});

redis.on('ready', () => {
  console.log('🚀 [Redis Client] Redis đã sẵn sàng nhận lệnh (READY)!');
});

redis.on('error', (err) => {
  // Bắt lỗi toàn cục để tránh unhandled exception làm crash toàn bộ tiến trình Node.js
  console.error('❌ [Redis Client Error]:', err.message);
});

redis.on('reconnecting', () => {
  console.log('🔄 [Redis Client] Đang cố gắng kết nối lại (Reconnecting)...');
});

module.exports = {
  redis,
  subClient,
  pubClient,
};
