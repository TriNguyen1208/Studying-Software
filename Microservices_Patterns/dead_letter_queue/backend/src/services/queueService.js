import { getChannel, TOPOLOGY } from '../config/rabbitmq.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// AUDIT LOG & DLQ REPOSITORY (CHO PHÉP GIAO DIỆN QUẢN TRỊ TRUY VẤN VÀ REDRIVE)
// ============================================================================
// Trong production, DLQ messages được lưu trong chính hàng đợi RabbitMQ hoặc
// được một DLQ Archiver Service đẩy vào Database (Postgres / Mongo / S3) để phân tích.
// Ở đây ta kết hợp cả 2: Message thực tế nằm trong RabbitMQ `orders.dlq` VÀ
// được đồng bộ vào DLQ Registry để Admin dễ dàng chỉnh sửa payload rồi Replay.
export const dlqRegistry = new Map();
export const eventLogs = [];
const sseClients = new Set();

/**
 * Đăng ký client nhận Live Server-Sent Events (SSE).
 */
export function addSseClient(res) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

/**
 * Phát broadcast sự kiện tới toàn bộ Frontend Dashboard đang kết nối.
 */
export function broadcastEvent(event, data) {
  const logEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    event,
    data,
  };
  eventLogs.unshift(logEntry);
  if (eventLogs.length > 100) eventLogs.pop(); // Giữ tối đa 100 logs gần nhất

  const payload = `data: ${JSON.stringify({ event, data: logEntry })}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

/**
 * Đẩy một đơn hàng mới vào Exchange chính.
 * @param {Object} orderData Dữ liệu đơn hàng
 * @param {string} scenario Kịch bản mô phỏng ('normal' | 'transient_fail' | 'poison_pill')
 */
export async function publishOrder(orderData, scenario = 'normal') {
  const channel = getChannel();
  const orderId = orderData.orderId || `ORD-${Date.now().toString().slice(-6)}`;
  
  const payload = {
    ...orderData,
    orderId,
    scenario, // Dùng để giả lập worker phản ứng tương ứng
    createdAt: new Date().toISOString(),
  };

  const messageBuffer = Buffer.from(JSON.stringify(payload));
  const headers = {
    'x-retry-count': 0,
    'x-original-queue': TOPOLOGY.QUEUES.MAIN,
    'x-correlation-id': uuidv4(),
  };

  channel.publish(
    TOPOLOGY.EXCHANGES.MAIN,
    TOPOLOGY.ROUTING_KEYS.PROCESS,
    messageBuffer,
    {
      persistent: true, // Lưu tin nhắn xuống đĩa cứng (Durable message)
      headers,
      contentType: 'application/json',
      messageId: payload.orderId,
    }
  );

  broadcastEvent('ORDER_PUBLISHED', {
    orderId: payload.orderId,
    item: payload.item,
    amount: payload.amount,
    scenario,
    headers,
    message: `Đơn hàng [${payload.orderId}] đã bắn vào Exchange [${TOPOLOGY.EXCHANGES.MAIN}] với kịch bản: ${scenario}`,
  });

  return payload;
}

/**
 * Đẩy tin nhắn vào Hàng Đợi Retry (sử dụng độ trễ TTL).
 */
export async function publishToRetry(payload, currentRetryCount, reason) {
  const channel = getChannel();
  const nextRetryCount = currentRetryCount + 1;

  const headers = {
    'x-retry-count': nextRetryCount,
    'x-last-error': reason,
    'x-retry-timestamp': new Date().toISOString(),
  };

  const buffer = Buffer.from(JSON.stringify(payload));

  channel.publish(
    TOPOLOGY.EXCHANGES.RETRY,
    TOPOLOGY.ROUTING_KEYS.RETRY,
    buffer,
    {
      persistent: true,
      headers,
      contentType: 'application/json',
      messageId: payload.orderId,
    }
  );

  broadcastEvent('MESSAGE_SENT_TO_RETRY', {
    orderId: payload.orderId,
    retryCount: nextRetryCount,
    maxRetries: TOPOLOGY.CONFIG.MAX_RETRIES,
    delayMs: TOPOLOGY.CONFIG.RETRY_TTL_MS,
    reason,
    message: `Đơn hàng [${payload.orderId}] lỗi tạm thời (${reason}). Đã chuyển sang Retry Queue, chờ ${TOPOLOGY.CONFIG.RETRY_TTL_MS / 1000}s trước khi thử lại lần ${nextRetryCount}.`,
  });
}

/**
 * Lấy thống kê số lượng message trong từng Queue qua AMQP checkQueue.
 */
export async function getQueueStats() {
  const channel = getChannel();
  try {
    const mainStats = await channel.checkQueue(TOPOLOGY.QUEUES.MAIN);
    const retryStats = await channel.checkQueue(TOPOLOGY.QUEUES.RETRY);
    const dlqStats = await channel.checkQueue(TOPOLOGY.QUEUES.DLQ);

    return {
      main: {
        name: TOPOLOGY.QUEUES.MAIN,
        messageCount: mainStats.messageCount,
        consumerCount: mainStats.consumerCount,
      },
      retry: {
        name: TOPOLOGY.QUEUES.RETRY,
        messageCount: retryStats.messageCount,
        consumerCount: retryStats.consumerCount,
        ttlMs: TOPOLOGY.CONFIG.RETRY_TTL_MS,
      },
      dlq: {
        name: TOPOLOGY.QUEUES.DLQ,
        messageCount: dlqStats.messageCount,
        consumerCount: dlqStats.consumerCount,
        registeredCount: dlqRegistry.size,
      },
    };
  } catch (err) {
    console.error('Lỗi khi lấy stats queue:', err.message);
    return {
      main: { messageCount: 0 },
      retry: { messageCount: 0 },
      dlq: { messageCount: dlqRegistry.size },
    };
  }
}

/**
 * Tái sinh (Replay/Redrive) một tin nhắn chết trong DLQ:
 * 1. Cho phép cập nhật lại payload hợp lệ (Fix Poison Pill)
 * 2. Đẩy lại vào Main Exchange
 * 3. Xóa khỏi danh sách DLQ Registry
 */
export async function redriveDeadLetter(orderId, updatedPayload = null) {
  const deadItem = dlqRegistry.get(orderId);
  if (!deadItem) {
    throw new Error(`Không tìm thấy tin nhắn [${orderId}] trong Dead Letter Queue Registry.`);
  }

  const channel = getChannel();
  const finalPayload = updatedPayload ? { ...deadItem.payload, ...updatedPayload } : deadItem.payload;
  
  // Khi đã sửa đổi hoặc admin quyết định replay, reset kịch bản lỗi thành normal
  finalPayload.scenario = 'normal';

  const headers = {
    'x-retry-count': 0, // Reset retry count cho chu kỳ mới
    'x-redriven-from-dlq': true,
    'x-redriven-at': new Date().toISOString(),
    'x-previous-death-reason': deadItem.deathReason,
  };

  const buffer = Buffer.from(JSON.stringify(finalPayload));

  channel.publish(
    TOPOLOGY.EXCHANGES.MAIN,
    TOPOLOGY.ROUTING_KEYS.PROCESS,
    buffer,
    {
      persistent: true,
      headers,
      contentType: 'application/json',
      messageId: finalPayload.orderId,
    }
  );

  // Xóa khỏi DLQ Registry
  dlqRegistry.delete(orderId);

  broadcastEvent('DLQ_MESSAGE_REDRIVEN', {
    orderId,
    finalPayload,
    message: `Đơn hàng [${orderId}] đã được REDRIVE (Tái sinh) thành công từ DLQ về Hàng đợi chính!`,
  });

  return finalPayload;
}

/**
 * Bỏ qua / Tiêu hủy (Discard) một tin nhắn độc hại vĩnh viễn khỏi DLQ.
 */
export function discardDeadLetter(orderId) {
  if (!dlqRegistry.has(orderId)) {
    throw new Error(`Không tìm thấy tin nhắn [${orderId}] trong DLQ.`);
  }
  dlqRegistry.delete(orderId);

  broadcastEvent('DLQ_MESSAGE_DISCARDED', {
    orderId,
    message: `Đơn hàng độc [${orderId}] đã bị TIÊU HỦY vĩnh viễn khỏi DLQ bởi Quản trị viên.`,
  });

  return { success: true, orderId };
}
