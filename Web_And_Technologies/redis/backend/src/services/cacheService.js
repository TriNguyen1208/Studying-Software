const { redis } = require('../config/redis');
const { findProductFromDatabase, getAllProductsFromDatabase, sleep } = require('../mock/products');

// Thống kê Cache Hit / Cache Miss phục vụ trực quan hóa trên Frontend
const cacheStats = {
  hits: 0,
  misses: 0,
  totalQueries: 0,
};

/**
 * CACHE-ASIDE PATTERN (LAZY LOADING)
 * 
 * Luồng hoạt động:
 * 1. Ứng dụng đọc từ Redis Cache trước.
 * 2. Nếu Cache Hit -> Trả về dữ liệu ngay lập tức (< 2ms).
 * 3. Nếu Cache Miss -> Đọc từ Database (150ms - 300ms) -> Ghi vào Redis với TTL -> Trả về Client.
 * 
 * Rủi ro nếu không có TTL: Cache vĩnh cửu dẫn đến rò rỉ RAM (OOM) và không bao giờ cập nhật dữ liệu mới khi DB thay đổi.
 */
async function getProductWithCacheAside(productId) {
  const cacheKey = `product:${productId}`;
  const startTime = Date.now();
  cacheStats.totalQueries++;

  // BƯỚC 1: Đọc từ Redis Cache (In-Memory Lookup O(1))
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    cacheStats.hits++;
    const latencyMs = Date.now() - startTime;

    // Kiểm tra xem có phải "Null Cache" (Chống Cache Penetration) không
    if (cachedData === "@@NULL@@") {
      return {
        source: 'CACHE_HIT (NULL_OBJECT)',
        data: null,
        latencyMs,
        cacheStats,
        message: 'Bảo vệ thành công: Chặn truy vấn ID không tồn tại xuống Database nhờ Cache Null Object!'
      };
    }

    return {
      source: 'CACHE_HIT',
      data: JSON.parse(cachedData),
      latencyMs,
      cacheStats,
      message: 'Lấy dữ liệu trực tiếp từ RAM của Redis siêu tốc!'
    };
  }

  // BƯỚC 2: Cache Miss -> Truy vấn từ Database vật lý
  cacheStats.misses++;
  const { data: dbData, dbLatencyMs } = await findProductFromDatabase(productId);
  const totalLatencyMs = Date.now() - startTime;

  // BƯỚC 3: Xử lý ghi vào Cache
  if (dbData) {
    // Lưu vào Redis với TTL = 60 giây.
    // Lệnh: SET key value EX 60 (Lưu và đặt hạn nguyên tử trong 1 lệnh duy nhất)
    await redis.set(cacheKey, JSON.stringify(dbData), 'EX', 60);
  } else {
    // 🛡️ PHÒNG CHỐNG CACHE PENETRATION (Thâm nhập bộ nhớ đệm):
    // Rủi ro: Hacker spam liên tục các ID rác không tồn tại trong DB (ví dụ: prod_9999).
    // Nếu không cache giá trị rỗng, mọi request sẽ đâm thẳng xuống Database làm sập DB (Denial of Service).
    // Giải pháp: Cache một giá trị sentinel rỗng "@@NULL@@" với TTL ngắn (ví dụ: 30s).
    await redis.set(cacheKey, "@@NULL@@", 'EX', 30);
  }

  return {
    source: 'CACHE_MISS (DATABASE)',
    data: dbData,
    latencyMs: totalLatencyMs,
    dbLatencyMs,
    cacheStats,
    message: 'Dữ liệu chưa có trong cache. Đã truy vấn Database và nạp vào Redis với TTL 60s.'
  };
}

/**
 * GIẢI PHÁP CHỐNG CACHE STAMPEDE / CACHE BREAKDOWN (SINGLEFLIGHT / MUTEX LOCK)
 * 
 * Vấn đề: Khi một Hot Key (ví dụ: Trang chủ flash sale có 10,000 requests/giây) vừa hết hạn (TTL Expired),
 * 10,000 requests đồng thời thấy Cache Miss và cùng lúc ùa xuống Database để query.
 * Hậu quả: Database nghẽn I/O và sập ngay lập tức (Thundering Herd Problem).
 * 
 * Giải pháp: Sử dụng Redis Mutex Lock (SET NX PX).
 * Chỉ duy nhất 1 luồng đầu tiên giành được Lock được phép xuống Database lấy dữ liệu và nạp lại Cache.
 * Các luồng khác ngủ chờ vài chục mili-giây rồi đọc lại từ Cache đã được nạp mới.
 */
async function getProductWithMutexLock(productId) {
  const cacheKey = `product:${productId}`;
  const lockKey = `lock:product:${productId}`;
  const startTime = Date.now();

  // Thử đọc từ Cache trước
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return {
      source: 'CACHE_HIT',
      data: JSON.parse(cachedData),
      latencyMs: Date.now() - startTime,
      protectionMechanism: 'Mutex Lock (SingleFlight)'
    };
  }

  // Cache Miss! Thử giành quyền Mutex Lock bằng `SET lockKey token NX PX 3000`
  // NX = Only set if Not eXists; PX = Expire after 3000ms (Tránh Deadlock nếu node query DB bị chết đột tử)
  const lockAcquired = await redis.set(lockKey, 'locked_by_worker', 'NX', 'PX', 3000);

  if (lockAcquired) {
    try {
      console.log(`[Mutex Lock] Luồng giành được lock cho ${productId}. Đang nạp từ DB...`);
      const { data: dbData } = await findProductFromDatabase(productId);

      if (dbData) {
        await redis.set(cacheKey, JSON.stringify(dbData), 'EX', 60);
      }
      return {
        source: 'CACHE_MISS (DB_LOADER_WITH_MUTEX)',
        data: dbData,
        latencyMs: Date.now() - startTime,
        protectionMechanism: 'Được bảo vệ: Luồng này đã giữ Lock và cứu Database khỏi 10,000 request sập dồn!'
      };
    } finally {
      // Giải phóng lock ngay sau khi nạp xong dữ liệu
      await redis.del(lockKey);
    }
  } else {
    // Các luồng khác không giành được Lock -> Chờ 100ms rồi đọc lại Cache
    console.log(`[Mutex Lock] Luồng KHÔNG giành được lock cho ${productId}. Đang chờ 100ms...`);
    await sleep(100);
    const retryCached = await redis.get(cacheKey);
    return {
      source: 'CACHE_HIT_AFTER_MUTEX_WAIT',
      data: retryCached ? JSON.parse(retryCached) : null,
      latencyMs: Date.now() - startTime,
      protectionMechanism: 'Thành công: Luồng đã xếp hàng đợi và đọc Cache ngay sau khi luồng giữ lock nạp xong!'
    };
  }
}

/**
 * Xóa Cache thủ công (Cache Invalidation)
 */
async function invalidateProductCache(productId) {
  const cacheKey = `product:${productId}`;
  const deleted = await redis.del(cacheKey);
  return { success: deleted > 0, key: cacheKey };
}

/**
 * Xóa toàn bộ cache sản phẩm
 */
async function clearAllProductCache() {
  const keys = await redis.keys('product:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.totalQueries = 0;
  return { success: true, count: keys.length };
}

function getStats() {
  const total = cacheStats.totalQueries;
  const hitRatio = total > 0 ? ((cacheStats.hits / total) * 100).toFixed(1) : "0.0";
  return {
    ...cacheStats,
    hitRatio: `${hitRatio}%`,
  };
}

module.exports = {
  getProductWithCacheAside,
  getProductWithMutexLock,
  invalidateProductCache,
  clearAllProductCache,
  getStats,
};
