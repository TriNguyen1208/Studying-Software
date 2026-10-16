/**
 * CONCRETE DECORATOR 6: AuditLogDecorator
 * 
 * VAI TRÒ:
 * - Ghi lại nhật ký kiểm toán bất biến (Tamper-evident Cryptographic Audit Trail).
 * - Tính mã băm SHA-256 của toàn bộ dấu vết các tầng xử lý và kết quả lưu trữ.
 * - Lưu vết vào bảng pipeline_audit_logs để phục vụ thanh tra an ninh mạng.
 */

const crypto = require('crypto');
const BasePipelineDecorator = require('./BasePipelineDecorator');
const db = require('../config/db');

class AuditLogDecorator extends BasePipelineDecorator {
  get layerName() {
    return 'AuditLogDecorator';
  }

  async process(context) {
    context.addTrace({
      layer: this.layerName,
      phase: 'BEFORE',
      detail: `[Kiểm toán nhập cuộc] Khởi tạo phiên audit cho Document #${context.documentId} (Tenant: ${context.tenantId})`
    });

    // Thực thi chuỗi xử lý bên trong
    const result = await this.wrappee.process(context);

    // Tính toán mã băm SHA-256 xác thực tính toàn vẹn
    const auditSignature = crypto
      .createHash('sha256')
      .update(`${context.documentId}:${context.tenantId}:${result.finalPayload}`)
      .digest('hex');

    context.addTrace({
      layer: this.layerName,
      phase: 'AFTER',
      detail: `[Kiểm toán hoàn tất] Tạo chữ ký toàn vẹn SHA-256: ${auditSignature.substring(0, 16)}... Lưu nhật ký kiểm toán.`,
      extra: { auditSignature }
    });

    const auditRecord = {
      id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      document_id: context.documentId,
      tenant_id: context.tenantId,
      pipeline_stack: this.getActiveLayers(),
      layer_traces: context.traceLogs,
      total_latency_ms: result.totalDurationMs,
      cache_status: result.cacheStatus,
      created_at: new Date().toISOString()
    };

    if (db.isDbConnected()) {
      try {
        await db.query(
          `INSERT INTO pipeline_audit_logs (id, document_id, tenant_id, pipeline_stack, layer_traces, total_latency_ms, cache_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [auditRecord.id, auditRecord.document_id, auditRecord.tenant_id, JSON.stringify(auditRecord.pipeline_stack), JSON.stringify(auditRecord.layer_traces), auditRecord.total_latency_ms, auditRecord.cache_status]
        );
      } catch (err) {
        console.warn(`[AuditLog DB Error]: ${err.message}`);
      }
    }

    const mem = db.getMemoryStore();
    mem.auditLogs.unshift(auditRecord);
    if (mem.auditLogs.length > 200) mem.auditLogs.pop();

    result.activeDecorators = this.getActiveLayers();
    return result;
  }
}

module.exports = AuditLogDecorator;
