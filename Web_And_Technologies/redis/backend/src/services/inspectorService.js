const { redis } = require('../config/redis');

/**
 * REDIS ENGINE METRICS INSPECTOR
 * 
 * Lấy các chỉ số hoạt động sâu từ câu lệnh `INFO`:
 * - `mem_fragmentation_ratio`: Tỷ lệ phân mảnh bộ nhớ (used_memory_rss / used_memory).
 *   + Nếu > 1.5: Bộ nhớ OS cấp phát lớn hơn nhiều so với dữ liệu thực tế -> Phân mảnh RAM nghiêm trọng.
 *   + Nếu < 1.0: Redis đang bị OS đẩy vào đĩa SWAP -> Thảm họa hiệu năng, trễ tăng vọt!
 * - `instantaneous_ops_per_sec`: Số lệnh xử lý trong 1 giây.
 * - `keyspace_hits` vs `keyspace_misses`: Hiệu quả của Cache.
 */
async function getRedisInfo() {
  const rawInfo = await redis.info();
  const lines = rawInfo.split('\r\n');
  const metrics = {};

  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, val] = line.split(':');
      if (key && val) {
        metrics[key.trim()] = val.trim();
      }
    }
  }

  // Lấy danh sách keys hiện tại trong database
  const allKeys = await redis.keys('*');
  const sampleKeys = [];
  for (const key of allKeys.slice(0, 15)) {
    const type = await redis.type(key);
    const ttl = await redis.ttl(key);
    sampleKeys.push({ key, type, ttl });
  }

  const hits = parseInt(metrics.keyspace_hits || '0', 10);
  const misses = parseInt(metrics.keyspace_misses || '0', 10);
  const total = hits + misses;
  const hitRatio = total > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';

  return {
    version: metrics.redis_version || '7.x',
    mode: metrics.redis_mode || 'standalone',
    uptimeSeconds: parseInt(metrics.uptime_in_seconds || '0', 10),
    uptimeDays: parseInt(metrics.uptime_in_days || '0', 10),
    os: metrics.os,
    clients: {
      connected: parseInt(metrics.connected_clients || '0', 10),
      blocked: parseInt(metrics.blocked_clients || '0', 10),
    },
    memory: {
      usedHuman: metrics.used_memory_human || '0B',
      usedRssHuman: metrics.used_memory_rss_human || '0B',
      peakHuman: metrics.used_memory_peak_human || '0B',
      fragmentationRatio: parseFloat(metrics.mem_fragmentation_ratio || '1.0'),
      maxmemoryHuman: metrics.maxmemory_human || '256M',
    },
    performance: {
      opsPerSec: parseInt(metrics.instantaneous_ops_per_sec || '0', 10),
      totalCommands: parseInt(metrics.total_commands_processed || '0', 10),
      hits,
      misses,
      hitRatio: `${hitRatio}%`,
    },
    persistence: {
      aofEnabled: metrics.aof_enabled === '1',
      rdbLastBgsaveStatus: metrics.rdb_last_bgsave_status || 'ok',
    },
    totalKeys: allKeys.length,
    sampleKeys,
  };
}

module.exports = {
  getRedisInfo,
};
