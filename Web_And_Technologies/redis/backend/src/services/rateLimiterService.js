const { redis } = require('../config/redis');

/**
 * SLIDING WINDOW LOG RATE LIMITER USING REDIS SORTED SET & LUA SCRIPT
 * 
 * Tại sao KHÔNG DÙNG Fixed Window (Cửa sổ cố định)?
 * Nhược điểm chí tử của Fixed Window (dùng INCR thông thường):
 * - Giả sử giới hạn: 10 requests / 1 phút.
 * - Người dùng gửi 10 requests vào giây thứ 00:59.
 * - Sau đó gửi tiếp 10 requests vào giây thứ 01:01.
 * - Kết quả: Trong khoảng 2 giây, người dùng đã gửi 20 requests mà hệ thống không chặn được! (Gấp đôi giới hạn - Traffic Burst).
 * 
 * GIẢI PHÁP: SLIDING WINDOW LOG (Cửa sổ trượt chính xác tuyệt đối)
 * - Sử dụng Redis Sorted Set (ZSET).
 * - Mỗi request được lưu vào ZSET với:
 *   + `score` = Timestamp hiện tại (Unix timestamp tính bằng milliseconds).
 *   + `member` = Unique ID (timestamp + random float).
 * - Thuật toán 4 bước nguyên tử qua Lua script:
 *   1. Xóa toàn bộ các bản ghi cũ hơn cửa sổ trượt: `ZREMRANGEBYSCORE key 0 (now - windowSizeMs)`
 *   2. Đếm số lượng request hiện có trong cửa sổ: `ZCARD key`
 *   3. Nếu số lượng < limit: Thêm request mới vào ZSET `ZADD key now member` và reset TTL cho key. Cho phép request đi qua!
 *   4. Nếu số lượng >= limit: Từ chối request (HTTP 429 Too Many Requests).
 */
const SLIDING_WINDOW_LUA_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowSize = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local clearBefore = now - windowSize

  -- 1. Loại bỏ các request đã rơi ra ngoài cửa sổ thời gian
  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

  -- 2. Đếm số request hiện tại trong cửa sổ trượt
  local currentRequests = redis.call('ZCARD', key)

  -- 3. Kiểm tra xem có vượt quá giới hạn hay không
  if currentRequests < limit then
    -- Thêm request hiện tại vào ZSET
    local member = now .. '-' .. ARGV[4]
    redis.call('ZADD', key, now, member)
    -- Đặt thời gian sống cho key bằng đúng độ dài cửa sổ để Redis tự dọn rác
    redis.call('PEXPIRE', key, windowSize)
    return {1, limit - currentRequests - 1, currentRequests + 1}
  else
    -- Bị chặn (Rate limited)
    return {0, 0, currentRequests}
  end
`;

/**
 * Kiểm tra và áp dụng Rate Limiting cho một định danh (IP hoặc User ID)
 * @param {string} identifier - Địa chỉ IP hoặc User ID
 * @param {number} limit - Số request tối đa cho phép (mặc định: 10)
 * @param {number} windowSizeMs - Độ rộng cửa sổ thời gian tính bằng ms (mặc định: 10000ms = 10 giây)
 */
async function checkRateLimit(identifier, limit = 10, windowSizeMs = 10000) {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  // Thực thi Lua script nguyên tử
  const [allowed, remaining, currentCount] = await redis.eval(
    SLIDING_WINDOW_LUA_SCRIPT,
    1,
    key,
    now,
    windowSizeMs,
    limit,
    randomSuffix
  );

  // Lấy chi tiết danh sách timestamps trong window để visualizer vẽ trên giao diện
  const timestamps = await redis.zrange(key, 0, -1, 'WITHSCORES');
  const history = [];
  for (let i = 0; i < timestamps.length; i += 2) {
    history.push({
      member: timestamps[i],
      timestamp: parseInt(timestamps[i + 1], 10),
    });
  }

  return {
    allowed: allowed === 1,
    remainingRequests: remaining,
    currentCount,
    limit,
    windowSizeMs,
    history,
    retryAfterSeconds: allowed === 1 ? 0 : Math.ceil(windowSizeMs / 1000),
  };
}

/**
 * Xóa lịch sử rate limit cho một IP (phục vụ test)
 */
async function resetRateLimit(identifier) {
  const key = `ratelimit:${identifier}`;
  await redis.del(key);
  return { success: true, identifier };
}

module.exports = {
  checkRateLimit,
  resetRateLimit,
};
