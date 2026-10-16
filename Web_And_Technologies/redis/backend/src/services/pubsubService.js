const { pubClient, subClient } = require('../config/redis');

const DEFAULT_CHANNEL = 'channel:live_events';

// Danh sách các SSE HTTP response streams đang kết nối với trình duyệt
const sseClients = new Set();

/**
 * REDIS PUB/SUB SERVICE (PUBLISH / SUBSCRIBE PATTERN)
 * 
 * Bản chất của Redis Pub/Sub:
 * - "Fire-and-Forget" (Bắn rồi quên): Redis chuyển tiếp message ngay lập tức tới các subscribers đang kết nối qua TCP.
 * - KHÔNG LƯU TRỮ TRÊN ĐĨA HOẶC RAM: Nếu một subscriber bị rớt mạng đúng lúc message được publish, nó sẽ vĩnh viễn không nhận lại được message đó (At-most-once delivery).
 * - So sánh với Redis Streams: Nếu cần lưu trữ lịch sử, hỗ trợ Consumer Groups, và xác nhận nhận tin (ACK - At-least-once), hãy dùng **Redis Streams** thay vì Pub/Sub!
 */

// Đăng ký nhận tin trên kênh Redis
subClient.subscribe(DEFAULT_CHANNEL, (err, count) => {
  if (err) {
    console.error(`[Pub/Sub] Lỗi đăng ký kênh ${DEFAULT_CHANNEL}:`, err.message);
  } else {
    console.log(`📡 [Pub/Sub] Đã lắng nghe kênh "${DEFAULT_CHANNEL}". Tổng số kênh: ${count}`);
  }
});

// Xử lý message khi nhận từ Redis và phân phối tới tất cả client SSE (Server-Sent Events)
subClient.on('message', (channel, message) => {
  try {
    const parsed = JSON.parse(message);
    const ssePayload = `data: ${JSON.stringify(parsed)}\n\n`;

    // Broadcast tới tất cả browser tabs đang mở
    for (const clientRes of sseClients) {
      clientRes.write(ssePayload);
    }
  } catch (err) {
    console.error('[Pub/Sub] Lỗi parse message:', err);
  }
});

/**
 * Xuất bản tin nhắn mới lên kênh Redis
 */
async function publishMessage(topic, content, sender = 'Hệ Thống') {
  const payload = {
    id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    topic,
    content,
    sender,
    timestamp: new Date().toISOString(),
  };

  // PUBLISH channel message
  const subscriberCount = await pubClient.publish(DEFAULT_CHANNEL, JSON.stringify(payload));
  return {
    success: true,
    payload,
    subscriberCount,
  };
}

/**
 * Đăng ký một kết nối SSE từ Frontend
 */
function registerSSEClient(res) {
  sseClients.add(res);
  console.log(`[SSE] Client mới kết nối. Tổng số web clients: ${sseClients.size}`);

  // Gửi thông điệp chào mừng ban đầu
  res.write(`data: ${JSON.stringify({
    id: 'welcome',
    topic: 'SYSTEM',
    content: 'Đã kết nối thành công tới Redis Pub/Sub Live Event Stream!',
    sender: 'Redis Broker',
    timestamp: new Date().toISOString(),
  })}\n\n`);

  // Xóa client khi ngắt kết nối
  res.on('close', () => {
    sseClients.delete(res);
    console.log(`[SSE] Client ngắt kết nối. Còn lại: ${sseClients.size}`);
  });
}

module.exports = {
  publishMessage,
  registerSSEClient,
};
