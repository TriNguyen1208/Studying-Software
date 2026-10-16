import { publishOrder, getQueueStats, eventLogs, addSseClient } from '../services/queueService.js';

/**
 * Controller tiếp nhận yêu cầu đặt đơn hàng từ người dùng hoặc hệ thống khác.
 */
export async function createOrder(req, res) {
  try {
    const { item = 'MacBook Pro M3 Max', amount = 3500, customer = 'ductri@example.com', scenario = 'normal' } = req.body;

    const payload = await publishOrder({ item, amount, customer }, scenario);

    res.status(202).json({
      success: true,
      message: 'Đơn hàng đã được đưa vào hàng đợi xử lý.',
      data: payload,
    });
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy số liệu giám sát của các hàng đợi (Main, Retry, DLQ).
 */
export async function getStats(req, res) {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lấy lịch sử 100 sự kiện gần nhất trong hệ thống.
 */
export function getLogs(req, res) {
  res.json({ success: true, logs: eventLogs });
}

/**
 * Endpoint Server-Sent Events (SSE) để truyền dữ liệu thời gian thực cho Frontend.
 */
export function streamEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Gửi thông báo handshake ban đầu
  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', data: { message: 'Đã kết nối luồng dữ liệu thời gian thực DLQ Console.' } })}\n\n`);

  addSseClient(res);
}
