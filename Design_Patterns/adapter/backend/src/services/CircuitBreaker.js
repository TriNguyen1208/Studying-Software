/**
 * CIRCUIT BREAKER PATTERN FOR GATEWAY ADAPTERS
 * 
 * Tại sao cần Circuit Breaker trong hệ thống Payment Gateway?
 * - Khi một cổng thanh toán bên thứ 3 (ví dụ Ngân hàng Core Bank hoặc Stripe) bị sập mạng (Down),
 *   các request dồn ứ sẽ làm cạn kiệt Connection Pool và Thread/Worker của Backend (Cascading Failure).
 * - Circuit Breaker sẽ ngắt mạch ngay lập tức (OPEN), trả về lỗi lập tức cho khách hàng
 *   hoặc chuyển hướng sang Adapter dự phòng (Failover) mà không cần chờ 30 giây timeout.
 * 
 * 3 TRẠNG THÁI:
 * 1. CLOSED: Bình thường, request đi qua bình thường.
 * 2. OPEN: Mạch ngắt khi tỷ lệ lỗi vượt ngưỡng (Failure Threshold). Từ chối request ngay lập tức.
 * 3. HALF_OPEN: Sau một khoảng thời gian (Cooldown), cho 1 request thử nghiệm đi qua.
 *    Nếu thành công -> Đóng mạch (CLOSED). Nếu thất bại -> Tiếp tục ngắt (OPEN).
 */

class CircuitBreaker {
  constructor({ failureThreshold = 3, cooldownMs = 15000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    // Map<gatewayId, { state: 'CLOSED'|'OPEN'|'HALF_OPEN', failureCount, lastFailureTime }>
    this.circuits = new Map();
  }

  getCircuitState(gatewayId) {
    if (!this.circuits.has(gatewayId)) {
      this.circuits.set(gatewayId, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: null
      });
    }

    const circuit = this.circuits.get(gatewayId);

    // Kiểm tra chuyển từ OPEN sang HALF_OPEN nếu đã hết thời gian cooldown
    if (circuit.state === 'OPEN') {
      const now = Date.now();
      if (now - circuit.lastFailureTime > this.cooldownMs) {
        circuit.state = 'HALF_OPEN';
        console.log(`[CircuitBreaker] Cổng ${gatewayId} chuyển sang trạng thái HALF_OPEN (cho phép 1 request thử nghiệm)`);
      }
    }

    return circuit;
  }

  recordSuccess(gatewayId) {
    const circuit = this.getCircuitState(gatewayId);
    if (circuit.state === 'HALF_OPEN') {
      console.log(`[CircuitBreaker] Cổng ${gatewayId} đã phục hồi -> Chuyển về CLOSED`);
    }
    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
  }

  recordFailure(gatewayId) {
    const circuit = this.getCircuitState(gatewayId);
    circuit.failureCount += 1;
    circuit.lastFailureTime = Date.now();

    if (circuit.failureCount >= this.failureThreshold || circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      console.warn(`[CircuitBreaker] CẢNH BÁO: Mạch cho cổng "${gatewayId}" ĐÃ BỊ NGẮT (OPEN) do ${circuit.failureCount} lần lỗi liên tiếp!`);
    }
  }

  assertCanExecute(gatewayId) {
    const circuit = this.getCircuitState(gatewayId);
    if (circuit.state === 'OPEN') {
      const remainingSec = Math.ceil((this.cooldownMs - (Date.now() - circuit.lastFailureTime)) / 1000);
      throw new Error(`CircuitBreakerOpen: Cổng ${gatewayId} đang tạm ngưng do gặp sự cố. Vui lòng thử lại sau ${remainingSec}s hoặc chọn cổng khác.`);
    }
  }

  getAllStates() {
    const result = {};
    for (const [key, val] of this.circuits.entries()) {
      result[key] = {
        state: val.state,
        failureCount: val.failureCount,
        lastFailureTime: val.lastFailureTime
      };
    }
    return result;
  }

  resetCircuit(gatewayId) {
    if (this.circuits.has(gatewayId)) {
      this.circuits.set(gatewayId, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: null
      });
    }
  }
}

const circuitBreakerInstance = new CircuitBreaker();

module.exports = circuitBreakerInstance;
