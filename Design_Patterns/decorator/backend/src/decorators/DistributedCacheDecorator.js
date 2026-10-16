/**
 * CONCRETE DECORATOR 3: DistributedCacheDecorator
 * 
 * VAI TRÒ:
 * - Cung cấp tầng bộ đệm phân tán L1/L2 (In-memory + Redis).
 * - SỨC MẠNH CỦA DECORATOR (Short-circuiting Cache Hit):
 *   Khi tìm thấy dữ liệu trong Cache, Decorator lập tức trả về kết quả trong ~0.5ms,
 *   bỏ qua hoàn toàn các tầng Nén, Mã hóa và Disk I/O nặng nề bên dưới!
 * - Khi Cache Miss, Decorator chuyển tiếp lệnh xuống dưới, đợi kết quả trả về
 *   rồi tự động lưu ngược vào Cache cho lần sau (Cache Aside / Lazy Loading).
 */

const BasePipelineDecorator = require('./BasePipelineDecorator');
const { PipelineResult } = require('../domain/PipelineContext');
const { getCache, setCache } = require('../config/redis');

class DistributedCacheDecorator extends BasePipelineDecorator {
  constructor(wrappee, { ttlSeconds = 300 } = {}) {
    super(wrappee);
    this.ttlSeconds = ttlSeconds;
  }

  get layerName() {
    return 'DistributedCacheDecorator';
  }

  async process(context) {
    const cacheKey = `cache:doc:${context.tenantId}:${context.documentId}`;

    // 1. KIỂM TRA CACHE
    const cachedEntry = await getCache(cacheKey);

    if (cachedEntry) {
      // CACHE HIT: Ngắt luồng gọi sâu, trả về ngay lập tức!
      context.cacheStatus = 'HIT';
      context.currentSizeBytes = cachedEntry.finalSizeBytes;
      context.isCompressed = cachedEntry.isCompressed;
      context.isEncrypted = cachedEntry.isEncrypted;

      context.addTrace({
        layer: this.layerName,
        phase: 'INTERCEPT',
        detail: `[CACHE HIT] Tìm thấy tài liệu trong Redis Cache (Key: ${cacheKey}). Trả về ngay lập tức, bỏ qua hoàn toàn các tầng Disk I/O bên dưới!`,
        payloadPreview: cachedEntry.finalPayload,
        durationMs: 0.8
      });

      return new PipelineResult({
        documentId: context.documentId,
        tenantId: context.tenantId,
        title: context.title,
        finalPayload: cachedEntry.finalPayload,
        originalSizeBytes: context.originalSizeBytes,
        finalSizeBytes: cachedEntry.finalSizeBytes,
        isCompressed: cachedEntry.isCompressed,
        isEncrypted: cachedEntry.isEncrypted,
        cacheStatus: 'HIT',
        traceLogs: context.traceLogs,
        totalDurationMs: 0.8,
        activeDecorators: this.getActiveLayers()
      });
    }

    // CACHE MISS: Chuyển tiếp vào trong
    context.cacheStatus = 'MISS';
    context.addTrace({
      layer: this.layerName,
      phase: 'BEFORE',
      detail: `[CACHE MISS] Không có trong Cache (Key: ${cacheKey}). Đang chuyển tiếp xử lý xuống các tầng bên dưới...`
    });

    const result = await this.wrappee.process(context);

    // Lưu kết quả xử lý vào Cache cho lần gọi tiếp theo
    await setCache(cacheKey, {
      finalPayload: result.finalPayload,
      finalSizeBytes: result.finalSizeBytes,
      isCompressed: result.isCompressed,
      isEncrypted: result.isEncrypted
    }, this.ttlSeconds);

    context.addTrace({
      layer: this.layerName,
      phase: 'AFTER',
      detail: `[CACHE STORED] Đã lưu kết quả mới vào Redis Cache (TTL: ${this.ttlSeconds}s)`
    });

    result.cacheStatus = 'MISS';
    result.activeDecorators = this.getActiveLayers();
    return result;
  }
}

module.exports = DistributedCacheDecorator;
