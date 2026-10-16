/**
 * CONCRETE DECORATOR 1: TimingTelemetryDecorator
 * 
 * VAI TRÒ:
 * - Bổ sung tính năng đo lường hiệu năng độ chính xác cao (Microsecond Telemetry).
 * - Sử dụng process.hrtime.bigint() để đo thời gian thực thi của toàn bộ chuỗi bên trong.
 * - Đo lường biến động bộ nhớ Heap (Heap Memory Delta) trước và sau khi xử lý.
 */

const BasePipelineDecorator = require('./BasePipelineDecorator');

class TimingTelemetryDecorator extends BasePipelineDecorator {
  get layerName() {
    return 'TimingTelemetryDecorator';
  }

  async process(context) {
    const startMemory = process.memoryUsage().heapUsed;
    const startNano = process.hrtime.bigint();

    context.addTrace({
      layer: this.layerName,
      phase: 'BEFORE',
      detail: `[Bắt đầu đo lường] Khởi tạo đồng hồ đếm thời gian nano-giây và ghi nhận mốc bộ nhớ Heap: ${(startMemory / 1024).toFixed(1)} KB`
    });

    // Chuyển tiếp lời gọi hàm cho lớp bên trong (Wrappee)
    const result = await this.wrappee.process(context);

    const endNano = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    const elapsedMs = Number(endNano - startNano) / 1e6;
    const memoryDeltaKb = Number((endMemory - startMemory) / 1024);

    context.addTrace({
      layer: this.layerName,
      phase: 'AFTER',
      detail: `[Kết thúc đo lường] Tổng thời gian thực thi chuỗi: ${elapsedMs.toFixed(3)}ms (Biến thiên RAM: ${memoryDeltaKb.toFixed(1)} KB)`,
      durationMs: elapsedMs,
      extra: { elapsedMs, memoryDeltaKb }
    });

    result.totalDurationMs = elapsedMs;
    result.activeDecorators = this.getActiveLayers();
    return result;
  }
}

module.exports = TimingTelemetryDecorator;
