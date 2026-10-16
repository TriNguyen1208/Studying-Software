/**
 * ==============================================================================
 * PRODUCTION-GRADE API GATEWAY WITH OPOSSUM CIRCUIT BREAKER
 * ==============================================================================
 * Gateway này bảo vệ toàn bộ hệ thống trước sự cố chập chờn của Downstream Service.
 * Tích hợp Circuit Breaker 3 trạng thái: CLOSED, OPEN, HALF-OPEN và Graceful Fallback.
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const CircuitBreaker = require('opossum');

const app = express();
const PORT = process.env.PORT || 3003;
const DOWNSTREAM_URL = process.env.DOWNSTREAM_URL || 'http://unstable_service:3004/charge';

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------------------
// HÀM GỌI DOWNSTREAM SERVICE
// ------------------------------------------------------------------------------
async function callDownstreamPayment(payload) {
  const res = await axios.post(DOWNSTREAM_URL, payload, {
    timeout: 2000 // 2 giây timeout
  });
  return res.data;
}

// ------------------------------------------------------------------------------
// CẤU HÌNH CIRCUIT BREAKER CHUẨN ENTERPRISE
// ------------------------------------------------------------------------------
const breakerOptions = {
  timeout: 2000,                 // 2s không phản hồi => tính 1 lỗi
  errorThresholdPercentage: 50,  // 50% lỗi => Nhảy sang OPEN
  resetTimeout: 8000,            // 8s Cooldown trước khi chuyển sang HALF-OPEN
  rollingCountTimeout: 10000,    // Thống kê trong cửa sổ 10s
  volumeThreshold: 4,            // Tối thiểu 4 requests mới tính tỷ lệ

  // Lọc bỏ lỗi 4xx của client không tính vào mạch
  errorFilter: (err) => {
    return err.response && err.response.status >= 400 && err.response.status < 500;
  }
};

const breaker = new CircuitBreaker(callDownstreamPayment, breakerOptions);

// HÀM DỰ PHÒNG (GRACEFUL FALLBACK KHI MẠCH OPEN HOẶC LỖI)
breaker.fallback((payload, err) => {
  return {
    isFallback: true,
    status: 'DEGRADED_SUCCESS',
    paymentMethod: 'COD_FALLBACK',
    message: 'Cổng thanh toán đang ngắt mạch bảo trì. Đơn hàng chuyển sang phương thức COD an toàn!',
    breakerReason: err ? err.message : 'Circuit Open'
  };
});

// Thống kê sự kiện
const eventHistory = [];
const logBreakerEvent = (type, details) => {
  eventHistory.unshift({
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString(),
    type,
    details
  });
  if (eventHistory.length > 30) eventHistory.pop();
};

breaker.on('open', () => logBreakerEvent('OPEN', 'Cầu dao NHẢY (OPEN)! Các request tới sẽ trả fallback trong 0ms.'));
breaker.on('halfOpen', () => logBreakerEvent('HALF-OPEN', 'Cầu dao MỞ HÉ (HALF-OPEN)! Bắt đầu thăm dò mồi...'));
breaker.on('close', () => logBreakerEvent('CLOSED', 'Cầu dao ĐÓNG LẠI (CLOSED)! Dịch vụ downstream đã hồi phục.'));
breaker.on('fallback', () => logBreakerEvent('FALLBACK', 'Đã kích hoạt hàm Fallback trả kết quả dự phòng'));

// ------------------------------------------------------------------------------
// APIS
// ------------------------------------------------------------------------------

// API Nghiệp vụ Thanh toán
app.post('/api/checkout', async (req, res) => {
  const start = performance.now();
  try {
    const result = await breaker.fire(req.body);
    const duration = Math.round(performance.now() - start);

    res.status(200).json({
      ...result,
      latencyMs: duration,
      breakerState: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED'
    });
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    res.status(503).json({
      error: 'CIRCUIT_FAIL',
      message: err.message,
      latencyMs: duration,
      breakerState: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED'
    });
  }
});

// API Lấy trạng thái Circuit Breaker
app.get('/api/breaker-status', (req, res) => {
  const stats = breaker.stats;
  res.status(200).json({
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
    stats: {
      failures: stats.failures,
      successes: stats.successes,
      fallbacks: stats.fallbacks,
      rejects: stats.rejects,
      latencyMean: Math.round(stats.latencyMean || 0)
    },
    recentEvents: eventHistory
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Circuit Breaker Gateway running on port ${PORT}`);
});
