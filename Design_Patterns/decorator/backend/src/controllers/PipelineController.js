/**
 * PIPELINE API CONTROLLER & BENCHMARK ENGINE
 */

const PipelineBuilder = require('../services/PipelineBuilder');
const { PipelineContext } = require('../domain/PipelineContext');
const db = require('../config/db');
const { flushAllCache } = require('../config/redis');

class PipelineController {
  /**
   * Xử lý một tài liệu qua chuỗi Decorator được tùy chọn động
   */
  async processDocument(req, res, next) {
    try {
      const {
        documentId,
        tenantId = 'tenant_enterprise_01',
        title = 'Annual Financial Report',
        payload = 'Sample document content...',
        layers = ['timing', 'audit', 'rateLimit', 'cache', 'compression', 'encryption']
      } = req.body;

      if (!payload) {
        return res.status(400).json({ success: false, error: 'Thiếu trường payload' });
      }

      // 1. Khởi tạo đối tượng Context
      const context = new PipelineContext({
        documentId: documentId || `DOC_${Date.now()}`,
        tenantId,
        title,
        payload
      });

      // 2. Dùng PipelineBuilder lắp ráp chuỗi Decorator tại Runtime
      const pipeline = PipelineBuilder.create().setLayers(layers).build();

      // 3. Thực thi chuỗi xử lý (Client chỉ gọi đúng 1 hàm process!)
      const result = await pipeline.process(context);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Chạy benchmark so sánh 4 cấu hình Decorator khác nhau
   */
  async runBenchmark(req, res, next) {
    try {
      const { iterations = 30, sampleTextSizeKb = 5 } = req.body;
      const dummyText = 'OmniStream High-Performance I/O Pipeline Benchmark Data Block. '.repeat(sampleTextSizeKb * 15);

      const presets = [
        { id: 'base_only', name: '1. Base Storage Only', layers: [] },
        { id: 'with_cache', name: '2. Base + Distributed Cache', layers: ['timing', 'cache'] },
        { id: 'secure_storage', name: '3. Base + Compression + AES Encryption', layers: ['timing', 'compression', 'encryption'] },
        { id: 'full_stack', name: '4. Full Stack (Tất cả 6 Decorators)', layers: ['timing', 'audit', 'rateLimit', 'cache', 'compression', 'encryption'] }
      ];

      const benchmarkResults = [];

      for (const preset of presets) {
        const latencies = [];
        let finalSize = 0;
        let originalSize = 0;
        let cacheHits = 0;

        const pipeline = PipelineBuilder.create().setLayers(preset.layers).build();

        for (let i = 0; i < iterations; i++) {
          const docId = `BENCH_${preset.id}_${i % 5}`; // 5 docId luân phiên để test cache hit
          const ctx = new PipelineContext({
            documentId: docId,
            tenantId: 'tenant_bench',
            title: `Benchmark Doc #${i}`,
            payload: dummyText
          });

          const start = process.hrtime.bigint();
          const res = await pipeline.process(ctx);
          const end = process.hrtime.bigint();
          const durMs = Number(end - start) / 1e6;

          latencies.push(durMs);
          finalSize = res.finalSizeBytes;
          originalSize = res.originalSizeBytes;
          if (res.cacheStatus === 'HIT') cacheHits++;
        }

        latencies.sort((a, b) => a - b);
        const avgLatency = Number((latencies.reduce((a, b) => a + b, 0) / iterations).toFixed(2));
        const p95Latency = Number(latencies[Math.floor(iterations * 0.95)].toFixed(2));
        const minLatency = Number(latencies[0].toFixed(2));
        const maxLatency = Number(latencies[latencies.length - 1].toFixed(2));

        benchmarkResults.push({
          presetId: preset.id,
          name: preset.name,
          layers: preset.layers,
          iterations,
          avgLatencyMs: avgLatency,
          p95LatencyMs: p95Latency,
          minLatencyMs: minLatency,
          maxLatencyMs: maxLatency,
          originalSizeBytes: originalSize,
          finalSizeBytes: finalSize,
          savingsPercent: originalSize > 0 ? Number(((1 - finalSize / originalSize) * 100).toFixed(1)) : 0,
          cacheHitRatio: Number(((cacheHits / iterations) * 100).toFixed(1))
        });
      }

      return res.status(200).json({
        success: true,
        data: benchmarkResults
      });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '25', 10);
      if (db.isDbConnected()) {
        const dbRes = await db.query('SELECT * FROM pipeline_audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
        if (dbRes) return res.status(200).json({ success: true, data: dbRes.rows });
      }
      const mem = db.getMemoryStore();
      return res.status(200).json({ success: true, data: mem.auditLogs.slice(0, limit) });
    } catch (err) {
      next(err);
    }
  }

  async clearCache(req, res, next) {
    try {
      await flushAllCache();
      return res.status(200).json({ success: true, message: 'Đã xóa sạch bộ đệm Cache.' });
    } catch (err) {
      next(err);
    }
  }
}

const controllerInstance = new PipelineController();

module.exports = controllerInstance;
