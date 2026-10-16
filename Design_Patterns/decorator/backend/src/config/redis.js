/**
 * REDIS CLIENT CONFIGURATION
 * 
 * Sử dụng bởi DistributedCacheDecorator để lưu trữ dữ liệu cache phân tán (L2 Cache).
 * Hỗ trợ fallback sang Local Memory Map (L1 Cache) nếu Redis chưa chạy.
 */

const Redis = require('ioredis');

const localCache = new Map();
let redisClient = null;
let isRedisReady = false;

function initRedis() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6383', 10);

  redisClient = new Redis({
    host,
    port,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null;
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

async function flushAllCache() {
  if (isRedisReady && redisClient) {
    try {
      await redisClient.flushall();
    } catch {}
  }
  localCache.clear();
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
  flushAllCache,
  closeRedis,
  isRedisAvailable: () => isRedisReady
};
