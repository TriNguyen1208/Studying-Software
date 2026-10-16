/**
 * CONCRETE DECORATOR 2: RateLimiterDecorator
 * 
 * VAI TRÒ:
 * - Bảo vệ hệ thống khỏi tình trạng quá tải hoặc tấn công DoS/Spam.
 * - Triển khai thuật toán Token Bucket (Thùng token) phân chia theo từng tenantId.
 * - ĐẶC ĐIỂM QUAN TRỌNG CỦA DECORATOR (Short-circuiting):
 *   Nếu hết Token, Decorator này sẽ NÉM NGOẠI LỆ NGAY LẬP TỨC mà KHÔNG HỀ GỌI this.wrappee!
 *   Nhờ đó, các tầng bên trong (Nén, Mã hóa, DB Disk Write) hoàn toàn không tốn 1 chu kỳ CPU nào.
 */

const BasePipelineDecorator = require('./BasePipelineDecorator');

// Lưu trữ token bucket theo từng tenantId trong bộ nhớ
const tenantBuckets = new Map();

class RateLimiterDecorator extends BasePipelineDecorator {
  constructor(wrappee, { maxTokens = 15, refillRatePerSec = 3 } = {}) {
    super(wrappee);
    this.maxTokens = maxTokens;
    this.refillRatePerSec = refillRatePerSec;
  }

  get layerName() {
    return 'RateLimiterDecorator';
  }

  getBucket(tenantId) {
    const now = Date.now();
    if (!tenantBuckets.has(tenantId)) {
      tenantBuckets.set(tenantId, {
        tokens: this.maxTokens,
        lastRefill: now
      });
    }

    const bucket = tenantBuckets.get(tenantId);
    // Tính số token được nạp lại dựa trên thời gian trôi qua
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSec * this.refillRatePerSec;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    return bucket;
  }

  async process(context) {
    const bucket = this.getBucket(context.tenantId);

    if (bucket.tokens < 1) {
      context.addTrace({
        layer: this.layerName,
        phase: 'INTERCEPT',
        detail: `[NGẮT YÊU CẦU] Tenant "${context.tenantId}" đã vượt quá hạn mức Rate Limit (0/${this.maxTokens} tokens). Chặn đứng trước khi tới DB!`,
        durationMs: 0.1
      });
      const err = new Error(`Rate limit exceeded for tenant "${context.tenantId}". Please slow down.`);
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.status = 429;
      throw err;
    }

    // Tiêu thụ 1 token
    bucket.tokens -= 1;

    context.addTrace({
      layer: this.layerName,
      phase: 'BEFORE',
      detail: `[Kiểm tra giới hạn tần suất] Tenant "${context.tenantId}" đạt điều kiện. Còn lại ${bucket.tokens.toFixed(1)}/${this.maxTokens} tokens trong thùng.`
    });

    return this.wrappee.process(context);
  }
}

module.exports = RateLimiterDecorator;
