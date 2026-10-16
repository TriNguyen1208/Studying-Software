/**
 * ==============================================================================
 * PRODUCTION-GRADE RETRY ENGINE BACKEND SERVICE
 * ==============================================================================
 * Hiện thực hóa 4 chiến lược thử lại:
 * 1. NO_RETRY: Không thử lại (thất bại ngay lần đầu).
 * 2. FIXED_DELAY: Thử lại sau khoảng thời gian cố định.
 * 3. EXPONENTIAL_BACKOFF: Thử lại với thời gian chờ tăng theo hàm mũ 2^n.
 * 4. FULL_JITTER (AWS Pattern): Hàm mũ kết hợp độ lệch ngẫu nhiên để triệt tiêu sóng đồng pha.
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3005;
const FLAKY_SERVICE_URL = process.env.FLAKY_SERVICE_URL || 'http://flaky_service:3006/process-payment';

app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------------------
// RETRY ENGINE THỰC CHIẾN
// ------------------------------------------------------------------------------
async function executeRetryPipeline({
  strategy = 'FULL_JITTER',
  maxRetries = 3,
  baseDelayMs = 400,
  maxDelayMs = 4000,
  transactionId,
  isInvalidRequest = false
}) {
  const attemptsTelemetry = [];
  let attempt = 0;

  while (attempt <= maxRetries) {
    const attemptStart = Date.now();
    attempt++;

    try {
      const res = await axios.post(FLAKY_SERVICE_URL, {
        transactionId,
        isInvalidRequest
      }, { timeout: 2000 });

      attemptsTelemetry.push({
        attemptNumber: attempt,
        status: res.status,
        success: true,
        delayBeforeMs: 0,
        message: res.data.message
      });

      return {
        success: true,
        finalStatus: 200,
        attemptsCount: attempt,
        telemetry: attemptsTelemetry,
        data: res.data
      };
    } catch (err) {
      const status = err.response ? err.response.status : 500;
      const errorMsg = err.response?.data?.message || err.message;

      // KIỂM TRA LỖI CÓ THỂ RETRY KHÔNG (IS RETRYABLE?)
      // Nếu là lỗi 4xx của Client => Lỗi vĩnh viễn, DỪNG NGAY LẬP TỨC!
      const isRetryable = status >= 500 || status === 429;

      if (!isRetryable || attempt > maxRetries || strategy === 'NO_RETRY') {
        attemptsTelemetry.push({
          attemptNumber: attempt,
          status,
          success: false,
          delayBeforeMs: 0,
          error: errorMsg,
          stoppedReason: !isRetryable ? 'LỖI_VĨNH_VIỄN_4XX (Non-retryable)' : attempt > maxRetries ? 'HẾT_SỐ_LẦN_THỬ (Max retries exceeded)' : 'CHIẾN_LƯỢC_NO_RETRY'
        });

        return {
          success: false,
          finalStatus: status,
          attemptsCount: attempt,
          telemetry: attemptsTelemetry,
          error: errorMsg
        };
      }

      // TÍNH TOÁN THỜI GIAN CHỜ THEO CHIẾN LƯỢC ĐÃ CHỌN
      let delayMs = 0;
      if (strategy === 'FIXED') {
        delayMs = baseDelayMs;
      } else if (strategy === 'EXPONENTIAL') {
        delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      } else if (strategy === 'FULL_JITTER') {
        const maxExpDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
        // AWS Full Jitter: random(0, MaxExpDelay)
        delayMs = Math.floor(Math.random() * maxExpDelay);
      }

      attemptsTelemetry.push({
        attemptNumber: attempt,
        status,
        success: false,
        delayBeforeMs: delayMs,
        error: errorMsg
      });

      console.warn(`⚠️ [Retry Engine] Lần ${attempt} thất bại (${status}). Chờ ${delayMs}ms trước khi thử lần ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// ------------------------------------------------------------------------------
// API ENDPOINT
// ------------------------------------------------------------------------------
app.post('/api/order-with-retry', async (req, res) => {
  const { 
    strategy = 'FULL_JITTER', 
    maxRetries = 3, 
    isInvalidRequest = false,
    idempotencyKey = uuidv4()
  } = req.body;

  const result = await executeRetryPipeline({
    strategy,
    maxRetries,
    baseDelayMs: 400,
    maxDelayMs: 4000,
    transactionId: idempotencyKey,
    isInvalidRequest
  });

  res.status(result.success ? 200 : result.finalStatus || 500).json(result);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Retry Pattern Gateway service listening on port ${PORT}`);
});
