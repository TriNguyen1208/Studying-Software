const { v4: uuidv4 } = require('uuid');
const { redis } = require('../config/redis');
const { 
  getDatabaseStock, 
  resetDatabaseStock, 
  decrementDatabaseStockUnsafe, 
  sleep 
} = require('../mock/products');

/**
 * LUA SCRIPT GIẢI PHÓNG KHÓA PHÂN TÁN AN TOÀN (ATOMIC RELEASE LOCK)
 * 
 * Tại sao KHÔNG ĐƯỢC dùng `redis.del(lockKey)` thông thường?
 * RỦI RO CHÍ THƯƠNG:
 * 1. Client A lấy lock với TTL = 5 giây.
 * 2. Client A xử lý tác vụ nặng mất 7 giây (quá hạn TTL).
 * 3. Redis tự động xóa lock của Client A vì hết hạn.
 * 4. Client B thấy lock trống, lấy lock và bắt đầu xử lý.
 * 5. Client A hoàn thành tác vụ, gọi lệnh `DEL lockKey` -> VÔ TÌNH XÓA MẤT LOCK CỦA CLIENT B!
 * 6. Client C lập tức vào được vùng tranh chấp -> Hệ thống vỡ tan tính nhất quán.
 * 
 * GIẢI PHÁP: Mỗi client sinh một `lockValue = uuidv4()`.
 * Khi giải phóng, phải dùng Lua script để: "CHỈ XÓA NẾU GIÁ TRỊ TRONG REDIS TRÙNG VỚI UUID CỦA CHÍNH MÌNH".
 * Thao tác kiểm tra và xóa này phải mang tính NGUYÊN TỬ (Atomic).
 */
const RELEASE_LOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

/**
 * Lấy khóa phân tán (Acquire Lock)
 */
async function acquireDistributedLock(lockKey, lockValue, ttlMs = 5000) {
  // SET key value NX PX ttlMs
  // NX: Chỉ set nếu key chưa tồn tại
  // PX: Đặt thời gian sống tính bằng mili-giây
  const result = await redis.set(lockKey, lockValue, 'NX', 'PX', ttlMs);
  return result === 'OK';
}

/**
 * Giải phóng khóa phân tán an toàn (Release Lock)
 */
async function releaseDistributedLock(lockKey, lockValue) {
  const result = await redis.eval(RELEASE_LOCK_LUA_SCRIPT, 1, lockKey, lockValue);
  return result === 1;
}

/**
 * KỊCH BẢN 1: MUA HÀNG KHÔNG DÙNG LOCK (UNSAFE - RACE CONDITION DEMO)
 * Mô phỏng 50 người bấm mua cùng 1 lúc khi chỉ còn 5 chiếc iPhone.
 * Do bất đồng bộ và trễ I/O, nhiều request cùng đọc ra `stock = 5` rồi cùng trừ -> Tồn kho âm!
 */
async function simulatePurchaseWithoutLock(buyerId, productId = 'prod_flash_sale') {
  const currentStock = getDatabaseStock(productId);
  
  // Giả lập thời gian check thẻ tín dụng / tạo hóa đơn mất 50-80ms
  // Đây là "Cửa sổ cơ hội" để các request khác chen chân vào đọc cùng 1 stock cũ
  await sleep(Math.floor(Math.random() * 30) + 50);

  if (currentStock > 0) {
    const result = decrementDatabaseStockUnsafe(productId);
    return {
      success: true,
      buyerId,
      remainingStock: result.remaining,
      mode: 'UNSAFE (NO_LOCK)',
      message: `Đã mua thành công! Tồn kho ghi nhận còn: ${result.remaining}`
    };
  }

  return {
    success: false,
    buyerId,
    remainingStock: currentStock,
    mode: 'UNSAFE (NO_LOCK)',
    message: 'Hết hàng (Sold Out)!'
  };
}

/**
 * KỊCH BẢN 2: MUA HÀNG CÓ KHÓA PHÂN TÁN REDIS (SAFE - DISTRIBUTED LOCK)
 * Đảm bảo mỗi giao dịch trừ kho là duy nhất và tuần tự hóa tại tầng phân tán.
 */
async function simulatePurchaseWithDistributedLock(buyerId, productId = 'prod_flash_sale') {
  const lockKey = `lock:inventory:${productId}`;
  const lockValue = uuidv4();
  const maxRetries = 15;
  const retryDelayMs = 50;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 1. Thử chiếm Lock với TTL 3000ms
    const locked = await acquireDistributedLock(lockKey, lockValue, 3000);

    if (locked) {
      try {
        // 2. Vùng tranh chấp an toàn (Critical Section): Kiểm tra tồn kho và trừ kho
        const currentStock = getDatabaseStock(productId);

        // Giả lập tác vụ xử lý trong critical section
        await sleep(40);

        if (currentStock > 0) {
          const result = decrementDatabaseStockUnsafe(productId);
          return {
            success: true,
            buyerId,
            remainingStock: result.remaining,
            mode: 'SAFE (REDIS_DISTRIBUTED_LOCK)',
            attempts: attempt,
            message: `Khóa an toàn thành công! Đã mua thành công. Tồn kho còn lại: ${result.remaining}`
          };
        } else {
          return {
            success: false,
            buyerId,
            remainingStock: 0,
            mode: 'SAFE (REDIS_DISTRIBUTED_LOCK)',
            attempts: attempt,
            message: 'Hết hàng chính xác! Hệ thống chặn an toàn không bị âm kho.'
          };
        }
      } finally {
        // 3. Giải phóng lock bằng Lua Script nguyên tử
        await releaseDistributedLock(lockKey, lockValue);
      }
    }

    // Nếu không lấy được lock, chờ một khoảng thời gian ngẫu nhiên (Exponential jitter) rồi thử lại
    await sleep(retryDelayMs + Math.floor(Math.random() * 20));
  }

  return {
    success: false,
    buyerId,
    remainingStock: getDatabaseStock(productId),
    mode: 'SAFE (REDIS_DISTRIBUTED_LOCK)',
    message: 'Hệ thống bận (Lock Contention Timeout). Vui lòng thử lại sau!'
  };
}

module.exports = {
  acquireDistributedLock,
  releaseDistributedLock,
  simulatePurchaseWithoutLock,
  simulatePurchaseWithDistributedLock,
  getDatabaseStock,
  resetDatabaseStock,
};
