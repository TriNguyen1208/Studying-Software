/**
 * CONCRETE DECORATOR 4: GzipCompressionDecorator
 * 
 * VAI TRÒ:
 * - Nén dữ liệu không mất mát (Lossless Compression) bằng thuật toán Gzip (Zlib).
 * - Giảm kích thước dữ liệu truyền tải trên mạng và dung lượng lưu trữ trên đĩa/database.
 * - ĐẶC TÍNH: Biến đổi payload trước khi chuyển xuống tầng sâu hơn (Pre-processing Mutation).
 */

const zlib = require('zlib');
const BasePipelineDecorator = require('./BasePipelineDecorator');

class GzipCompressionDecorator extends BasePipelineDecorator {
  get layerName() {
    return 'GzipCompressionDecorator';
  }

  async process(context) {
    const startNano = process.hrtime.bigint();
    const sizeBefore = context.currentSizeBytes;

    // Tiến hành nén chuỗi payload thành Gzip Buffer
    const compressedBuffer = zlib.gzipSync(Buffer.from(context.payload, 'utf8'), { level: 6 });
    const sizeAfter = compressedBuffer.length;
    const ratio = sizeBefore > 0 ? ((1 - sizeAfter / sizeBefore) * 100).toFixed(1) : 0;

    // Cập nhật payload thành dạng Base64 và cập nhật metadata
    context.payload = compressedBuffer.toString('base64');
    context.currentSizeBytes = sizeAfter;
    context.isCompressed = true;

    const endNano = process.hrtime.bigint();
    const durationMs = Number(endNano - startNano) / 1e6;

    context.addTrace({
      layer: this.layerName,
      phase: 'BEFORE',
      detail: `[Nén dữ liệu Gzip] Kích thước giảm từ ${sizeBefore} B xuống ${sizeAfter} B (Tiết kiệm ${ratio}% dung lượng)`,
      payloadPreview: context.payload,
      durationMs,
      extra: { sizeBefore, sizeAfter, ratio }
    });

    // Chuyển tiếp payload đã nén xuống tầng tiếp theo
    const result = await this.wrappee.process(context);
    result.isCompressed = true;
    result.activeDecorators = this.getActiveLayers();
    return result;
  }
}

module.exports = GzipCompressionDecorator;
