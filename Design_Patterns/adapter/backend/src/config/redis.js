/**
 * REDIS CLIENT CONFIGURATION
 * 
 * Tại sao cần Redis trong kiến trúc Payment Gateway?
 * - Idempotency Lock: Tránh việc người dùng bấm đúp hoặc network retry tạo ra 2 giao dịch trừ tiền trùng lặp (Double Spending).
 * - Rate Limiting & Circuit Breaker State: Lưu trạng thái mở/đóng mạch (Circuit Breaker) tập trung giữa nhiều server instances.
 * - In-memory fallback: Nếu Redis container chưa chạy, tự chuyển sang Local Map để developer test ngay lập tức.
 */

const Redis = require('ioredis');

const localCache = new Map();
let redisClient = null;
let isRedisReady = false;

function initRedis() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6382', 10);

  redisClient = new Redis({
    host,
    port,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        // Sau 3 lần thử thất bại, ngừng spam log và fallback sang Local Cache
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true
  });

  redisClient.connect()
    .then(() => {
      isRedisReady = true;
      console.log(`[Redis] Đã kết nối thành công tới Redis trên cổng ${port}`);
    })
    .catch((err) => {
      console.warn(`[Redis Warning] Không thể kết nối Redis (${err.message}). Kích hoạt Local In-Memory Cache.`);
      isRedisReady = false;
    });

  redisClient.on('error', () => {
    isRedisReady = false;
  });
}

async function getCache(key) {
  if (isRedisReady && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      // Fallback
    }
  }
  return localCache.get(key) || null;
}

async function setCache(key, value, ttlSeconds = 300) {
  if (isRedisReady && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch {
      // Fallback
    }
  }
  localCache.set(key, value);
  setTimeout(() => localCache.delete(key), ttlSeconds * 1000);
}

async function closeRedis() {
  if (redisClient && isRedisReady) {
    console.log('[Redis] Đang ngắt kết nối Redis client...');
    await redisClient.quit();
  }
}

module.exports = {
  initRedis,
  getCache,
  setCache,
  closeRedis,
  isRedisAvailable: () => isRedisReady
};
