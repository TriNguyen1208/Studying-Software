require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { redis, pubClient, subClient } = require('./config/redis');
const { initializeLeaderboard } = require('./services/leaderboardService');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware cấu hình
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Gắn các API endpoints
app.use('/api', apiRoutes);

// Endpoint kiểm tra sức khỏe hệ thống (Healthcheck)
app.get('/health', async (req, res) => {
  try {
    const ping = await redis.ping();
    res.json({
      status: 'UP',
      redis: ping === 'PONG' ? 'HEALTHY' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      redisError: err.message,
    });
  }
});

// Middleware xử lý lỗi toàn cục (Global Error Handling)
// Tránh rò rỉ stack trace nhạy cảm ở môi trường production và đảm bảo server không crash ngầm
app.use((err, req, res, next) => {
  console.error('💥 [Server Internal Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'Đã có lỗi xảy ra trong hệ thống backend.',
  });
});

// Khởi chạy server và khởi tạo dữ liệu ban đầu
const server = app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Redis Deep Dive Backend running on port ${PORT}`);
  console.log(`📡 Healthcheck endpoint: http://localhost:${PORT}/health`);
  console.log(`==================================================\n`);

  try {
    await initializeLeaderboard();
  } catch (err) {
    console.warn('[Leaderboard] Không thể khởi tạo bảng xếp hạng ban đầu (Redis có thể chưa chạy):', err.message);
  }
});

/**
 * GRACEFUL SHUTDOWN (DỪNG HỆ THỐNG AN TOÀN)
 * 
 * Tại sao cần Graceful Shutdown trong production?
 * - Khi container Docker dừng hoặc Kubernetes rolling update gửi tín hiệu SIGTERM/SIGINT:
 *   + Nếu dừng đột ngột (Hard Kill): Các kết nối TCP đang dở dang bị đứt gãy, transaction hoặc distributed lock có thể bị bỏ quên gây deadlock cho node khác.
 *   + Graceful Shutdown: Ngừng nhận request mới, đợi các request đang chạy xử lý xong, giải phóng socket Redis bằng lệnh QUIT, rồi mới exit tiến trình.
 */
async function handleGracefulShutdown(signal) {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Bắt đầu quá trình Graceful Shutdown...`);

  // 1. Ngừng nhận request HTTP mới
  server.close(async () => {
    console.log('✅ Đã đóng toàn bộ kết nối HTTP server.');

    try {
      // 2. Đóng kết nối an toàn tới Redis
      console.log('⏳ Đang đóng kết nối an toàn tới các Redis clients...');
      await Promise.allSettled([
        redis.quit(),
        pubClient.quit(),
        subClient.quit(),
      ]);
      console.log('✅ Đã đóng an toàn toàn bộ kết nối Redis.');
    } catch (err) {
      console.error('❌ Lỗi khi đóng kết nối Redis:', err);
    } finally {
      console.log('👋 Tiến trình kết thúc an toàn. Tạm biệt!');
      process.exit(0);
    }
  });

  // Đặt timeout cưỡng chế dừng nếu quá 10 giây mà các kết nối chưa thoát hết
  setTimeout(() => {
    console.error('⚠️ Buộc dừng tiến trình do quá hạn timeout 10 giây (Force Exit)!');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
