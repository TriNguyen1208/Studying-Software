/**
 * PIPELINE CONTEXT & TRACE MODELS
 * 
 * Đối tượng Context mang dữ liệu và dấu vết (Trace) đi qua từng lớp Decorator.
 * Mỗi khi đi qua một Decorator:
 * 1. Decorator có thể bổ sung dữ liệu vào headers/metadata.
 * 2. Decorator có thể biến đổi payload (Nén, Mã hóa...).
 * 3. Decorator ghi vết hành vi (Trace Log) giúp trực quan hóa cơ chế "bóc tách vỏ củ hành" (Onion Layers).
 */

class PipelineContext {
  constructor({
    documentId,
    tenantId = 'tenant_default',
    title = 'Document',
    payload = '',
    operation = 'WRITE', // 'WRITE' | 'READ'
    metadata = {}
  }) {
    this.documentId = documentId || `DOC_${Date.now()}`;
    this.tenantId = tenantId;
    this.title = title;
    this.payload = String(payload);
    this.operation = operation;
    this.metadata = { ...metadata };

    // Đo lường kích thước
    this.originalSizeBytes = Buffer.byteLength(this.payload, 'utf8');
    this.currentSizeBytes = this.originalSizeBytes;

    // Trạng thái biến đổi
    this.isCompressed = false;
    this.isEncrypted = false;
    this.cacheStatus = 'NONE'; // 'NONE' | 'HIT' | 'MISS'

    // Dấu vết kiểm toán (Layer-by-Layer Trace Logs)
    this.traceLogs = [];
  }

  addTrace({ layer, phase, detail, payloadPreview = null, durationMs = 0, extra = {} }) {
    this.traceLogs.push({
      step: this.traceLogs.length + 1,
      layer,
      phase, // 'BEFORE' | 'AFTER' | 'INTERCEPT'
      detail,
      payloadSize: this.currentSizeBytes,
      payloadPreview: payloadPreview ? String(payloadPreview).substring(0, 160) : undefined,
      durationMs: Number(durationMs.toFixed(3)),
      timestamp: new Date().toISOString(),
      ...extra
    });
  }
}

class PipelineResult {
  constructor({
    documentId,
    tenantId,
    title,
    finalPayload,
    originalSizeBytes,
    finalSizeBytes,
    isCompressed,
    isEncrypted,
    cacheStatus,
    traceLogs = [],
    totalDurationMs = 0,
    activeDecorators = []
  }) {
    this.documentId = documentId;
    this.tenantId = tenantId;
    this.title = title;
    this.finalPayload = finalPayload;
    this.originalSizeBytes = originalSizeBytes;
    this.finalSizeBytes = finalSizeBytes;
    this.compressionRatio = originalSizeBytes > 0
      ? Number(((1 - finalSizeBytes / originalSizeBytes) * 100).toFixed(1))
      : 0;
    this.isCompressed = isCompressed;
    this.isEncrypted = isEncrypted;
    this.cacheStatus = cacheStatus;
    this.traceLogs = traceLogs;
    this.totalDurationMs = Number(totalDurationMs.toFixed(3));
    this.activeDecorators = activeDecorators;
  }
}

module.exports = {
  PipelineContext,
  PipelineResult
};
