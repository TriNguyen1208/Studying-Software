/**
 * PIPELINE BUILDER & COMPOSITION ENGINE
 * 
 * VAI TRÒ:
 * - Cung cấp cơ chế Fluent Builder để lắp ghép (Assemble) các Decorator tại thời điểm Runtime.
 * - Cho phép người dùng tùy ý chọn bật/tắt hoặc hoán đổi thứ tự các lớp Decorator để thí nghiệm.
 * - Ví dụ lắp ráp bọc lồng nhau:
 *   Timing(AuditLog(RateLimit(Cache(Encryption(Compression(BaseStorage))))))
 */

const BaseStorageService = require('../components/BaseStorageService');
const TimingTelemetryDecorator = require('../decorators/TimingTelemetryDecorator');
const RateLimiterDecorator = require('../decorators/RateLimiterDecorator');
const DistributedCacheDecorator = require('../decorators/DistributedCacheDecorator');
const GzipCompressionDecorator = require('../decorators/GzipCompressionDecorator');
const AesEncryptionDecorator = require('../decorators/AesEncryptionDecorator');
const AuditLogDecorator = require('../decorators/AuditLogDecorator');

class PipelineBuilder {
  constructor() {
    this.layers = [];
  }

  static create() {
    return new PipelineBuilder();
  }

  addLayer(layerName) {
    this.layers.push(layerName);
    return this;
  }

  setLayers(layerNames) {
    this.layers = [...layerNames];
    return this;
  }

  /**
   * Lắp ráp chuỗi Decorator từ trong ra ngoài (Inside-out Wrapping)
   * @returns {IDataPipeline} - Đối tượng ngoài cùng của chuỗi bọc
   */
  build() {
    // 1. Khởi tạo Concrete Component ở lõi trong cùng
    let pipeline = new BaseStorageService();

    // 2. Lần lượt bọc các Decorator từ trong ra ngoài (duyệt ngược danh sách)
    // Các lớp ở đầu mảng this.layers sẽ là lớp ngoài cùng tiếp nhận request đầu tiên!
    const reversed = [...this.layers].reverse();

    for (const layer of reversed) {
      switch (layer) {
        case 'compression':
        case 'GzipCompressionDecorator':
          pipeline = new GzipCompressionDecorator(pipeline);
          break;
        case 'encryption':
        case 'AesEncryptionDecorator':
          pipeline = new AesEncryptionDecorator(pipeline);
          break;
        case 'cache':
        case 'DistributedCacheDecorator':
          pipeline = new DistributedCacheDecorator(pipeline);
          break;
        case 'rateLimit':
        case 'RateLimiterDecorator':
          pipeline = new RateLimiterDecorator(pipeline);
          break;
        case 'audit':
        case 'AuditLogDecorator':
          pipeline = new AuditLogDecorator(pipeline);
          break;
        case 'timing':
        case 'TimingTelemetryDecorator':
          pipeline = new TimingTelemetryDecorator(pipeline);
          break;
        default:
          console.warn(`[PipelineBuilder] Bỏ qua tầng không xác định: ${layer}`);
      }
    }

    return pipeline;
  }
}

module.exports = PipelineBuilder;
