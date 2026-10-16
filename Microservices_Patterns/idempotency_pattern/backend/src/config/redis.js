const Redis = require('ioredis');
require('dotenv').config();

// Khởi tạo Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6383', 10),
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('[Redis] Đã kết nối thành công tới Redis Cluster/Node!');
});

redis.on('error', (err) => {
  console.error('[Redis Error] Mất kết nối tới Redis:', err.message);
});

// Định nghĩa Lua script giải phóng Distributed Lock an toàn
// Tránh trường hợp Worker A chạy quá hạn TTL, Worker B nhận lock mới,
// sau đó Worker A hoàn thành lại xóa nhầm lock của Worker B.
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

redis.defineCommand('releaseLock', {
  numberOfKeys: 1,
  lua: RELEASE_LOCK_LUA,
});

module.exports = redis;
