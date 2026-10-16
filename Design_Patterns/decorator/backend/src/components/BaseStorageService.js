/**
 * CONCRETE COMPONENT: BaseStorageService
 * 
 * VAI TRÒ TRONG PATTERN:
 * - Đây là thành phần gốc cốt lõi (Core Concrete Component) tương đương với FileInputStream trong Java I/O.
 * - Trách nhiệm duy nhất: Lưu trữ tài liệu thô vào Cơ sở dữ liệu (PostgreSQL / In-Memory Store).
 * - QUAN TRỌNG: Lớp này HOÀN TOÀN KHÔNG BIẾT đến Caching, Nén Gzip, Mã hóa AES, Rate Limiting hay Telemetry!
 *   Nó chỉ tập trung làm tốt một việc duy nhất: Ghi dữ liệu xuống đĩa.
 */

const IDataPipeline = require('../domain/IDataPipeline');
const { PipelineResult } = require('../domain/PipelineContext');
const db = require('../config/db');

class BaseStorageService extends IDataPipeline {
  get layerName() {
    return 'BaseStorageService';
  }

  async process(context) {
    const startTime = process.hrtime.bigint();

    // Giả lập Disk I/O Latency thực tế khi ghi dữ liệu xuống đĩa cứng (10ms - 25ms)
    await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 10));

    context.addTrace({
      layer: this.layerName,
      phase: 'EXECUTE',
      detail: `Lưu trữ tài liệu xuống Database (Kích thước: ${context.currentSizeBytes} bytes, Encrypted: ${context.isEncrypted}, Compressed: ${context.isCompressed})`,
      payloadPreview: context.payload
    });

    // Lưu vào PostgreSQL nếu có, nếu không lưu vào In-Memory Store
    const docRecord = {
      id: context.documentId,
      tenant_id: context.tenantId,
      title: context.title,
      payload: context.payload,
      is_encrypted: context.isEncrypted,
      is_compressed: context.isCompressed,
      original_size_bytes: context.originalSizeBytes,
      stored_size_bytes: context.currentSizeBytes,
      metadata: context.metadata,
      created_at: new Date().toISOString()
    };

    if (db.isDbConnected()) {
      try {
        await db.query(
          `INSERT INTO documents (id, tenant_id, title, payload, is_encrypted, is_compressed, original_size_bytes, stored_size_bytes, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, stored_size_bytes = EXCLUDED.stored_size_bytes`,
          [docRecord.id, docRecord.tenant_id, docRecord.title, docRecord.payload, docRecord.is_encrypted, docRecord.is_compressed, docRecord.original_size_bytes, docRecord.stored_size_bytes, JSON.stringify(docRecord.metadata)]
        );
      } catch (err) {
        console.warn(`[BaseStorage DB Error]: ${err.message}. Fallback Memory Store.`);
      }
    }

    const mem = db.getMemoryStore();
    const existingIdx = mem.documents.findIndex((d) => d.id === docRecord.id);
    if (existingIdx >= 0) {
      mem.documents[existingIdx] = docRecord;
    } else {
      mem.documents.unshift(docRecord);
      if (mem.documents.length > 200) mem.documents.pop();
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    return new PipelineResult({
      documentId: context.documentId,
      tenantId: context.tenantId,
      title: context.title,
      finalPayload: context.payload,
      originalSizeBytes: context.originalSizeBytes,
      finalSizeBytes: context.currentSizeBytes,
      isCompressed: context.isCompressed,
      isEncrypted: context.isEncrypted,
      cacheStatus: context.cacheStatus,
      traceLogs: context.traceLogs,
      totalDurationMs: durationMs,
      activeDecorators: [this.layerName]
    });
  }
}

module.exports = BaseStorageService;
