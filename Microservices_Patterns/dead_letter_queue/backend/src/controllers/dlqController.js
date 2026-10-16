import { dlqRegistry, redriveDeadLetter, discardDeadLetter } from '../services/queueService.js';

/**
 * Lấy danh sách toàn bộ tin nhắn hiện đang nằm trong Dead Letter Queue.
 */
export function getDlqMessages(req, res) {
  const messages = Array.from(dlqRegistry.values()).reverse();
  res.json({
    success: true,
    count: messages.length,
    messages,
  });
}

/**
 * Tái sinh (Redrive) một tin nhắn chết cụ thể: Cho phép sửa payload lỗi trước khi đẩy lại.
 */
export async function redriveMessage(req, res) {
  try {
    const { orderId } = req.params;
    const { updatedPayload } = req.body;

    const result = await redriveDeadLetter(orderId, updatedPayload);
    res.json({
      success: true,
      message: `Đơn hàng [${orderId}] đã được tái sinh và đẩy lại Main Queue thành công!`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * Tái sinh hàng loạt (Bulk Redrive) toàn bộ tin nhắn DLQ.
 */
export async function redriveAll(req, res) {
  try {
    const orderIds = Array.from(dlqRegistry.keys());
    const redriven = [];

    for (const orderId of orderIds) {
      const result = await redriveDeadLetter(orderId);
      redriven.push(result);
    }

    res.json({
      success: true,
      message: `Đã tái sinh ${redriven.length} tin nhắn về Main Queue.`,
      redrivenCount: redriven.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Tiêu hủy (Discard) một tin nhắn độc hại vĩnh viễn khỏi DLQ.
 */
export function discardMessage(req, res) {
  try {
    const { orderId } = req.params;
    const result = discardDeadLetter(orderId);
    res.json({
      success: true,
      message: `Đơn hàng [${orderId}] đã được tiêu hủy khỏi DLQ.`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
