/**
 * CONCRETE DECORATOR 5: AesEncryptionDecorator
 * 
 * VAI TRÒ:
 * - Mã hóa dữ liệu chuẩn quân đội AES-256-GCM (Authenticated Encryption).
 * - Tự động sinh Initialization Vector (IV) ngẫu nhiên 96-bit và 128-bit Authentication Tag.
 * - Bảo đảm an toàn tuyệt đối khi lưu trữ (Encryption at Rest) và tuân thủ GDPR, HIPAA.
 * - QUY TẮC THỨ TỰ SẮP XẾP:
 *   Nếu kết hợp với Compression, BẮT BUỘC phải NÉN TRƯỚC rồi MÃ HÓA SAU (Compress-then-Encrypt).
 *   Vì dữ liệu sau khi mã hóa có độ hỗn loạn (Entropy) tối đa, khiến thuật toán nén hoàn toàn bất lực!
 */

const crypto = require('crypto');
const BasePipelineDecorator = require('./BasePipelineDecorator');

// Secret Key 256-bit (32 bytes)
const MASTER_ENCRYPTION_KEY = crypto.scryptSync('omnistream_super_secret_master_passphrase', 'salt_pepper_99', 32);

class AesEncryptionDecorator extends BasePipelineDecorator {
  get layerName() {
    return 'AesEncryptionDecorator';
  }

  async process(context) {
    const startNano = process.hrtime.bigint();
    const sizeBefore = context.currentSizeBytes;

    // Sinh IV ngẫu nhiên 12 bytes (96 bits) chuẩn NIST cho chế độ GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(context.payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Trích xuất Auth Tag 16 bytes (128 bits) để chống giả mạo gói tin
    const authTag = cipher.getAuthTag();

    // Đóng gói ciphertext: 'ENC_GCM:<iv>:<tag>:<ciphertext>'
    const packedCiphertext = `ENC_GCM:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    const sizeAfter = Buffer.byteLength(packedCiphertext, 'utf8');

    context.payload = packedCiphertext;
    context.currentSizeBytes = sizeAfter;
    context.isEncrypted = true;

    const endNano = process.hrtime.bigint();
    const durationMs = Number(endNano - startNano) / 1e6;

    context.addTrace({
      layer: this.layerName,
      phase: 'BEFORE',
      detail: `[Mã hóa AES-256-GCM] Dữ liệu đã được mã hóa an toàn (IV: 12B, Tag: 16B). Kích thước: ${sizeAfter} B`,
      payloadPreview: packedCiphertext,
      durationMs,
      extra: { iv: iv.toString('hex'), authTag: authTag.toString('hex') }
    });

    // Chuyển tiếp ciphertext xuống tầng tiếp theo
    const result = await this.wrappee.process(context);
    result.isEncrypted = true;
    result.activeDecorators = this.getActiveLayers();
    return result;
  }
}

module.exports = AesEncryptionDecorator;
