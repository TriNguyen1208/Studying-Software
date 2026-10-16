import { getChannel, TOPOLOGY } from '../config/rabbitmq.js';
import { dlqRegistry, broadcastEvent } from '../services/queueService.js';

/**
 * Worker chuyên trách giám sát và tiêu thụ tin nhắn tử vong từ `orders.dlq`.
 * Trích xuất "Giấy chứng tử" (x-death header) của RabbitMQ để lưu vào Registry
 * phục vụ việc kiểm tra lỗi, cảnh báo và tái sinh (Redrive).
 */
export async function startDlqConsumer() {
  const channel = getChannel();

  console.log(`🚨 [DLQ Consumer] Đang lắng nghe trên Dead Letter Queue [${TOPOLOGY.QUEUES.DLQ}]...`);

  await channel.consume(
    TOPOLOGY.QUEUES.DLQ,
    async (msg) => {
      if (!msg) return;

      const rawContent = msg.content.toString();
      let payload;
      try {
        payload = JSON.parse(rawContent);
      } catch (e) {
        payload = { malformedContent: rawContent };
      }

      const headers = msg.properties.headers || {};
      const xDeath = headers['x-death'] || [];

      // Phân tích nguyên nhân tử vong từ header x-death của RabbitMQ
      let primaryDeath = null;
      if (Array.isArray(xDeath) && xDeath.length > 0) {
        primaryDeath = {
          count: xDeath[0].count,
          reason: xDeath[0].reason,       // 'rejected' | 'expired' | 'maxlen'
          queue: xDeath[0].queue,         // 'orders.main.q'
          time: xDeath[0].time ? new Date(xDeath[0].time * 1000).toISOString() : new Date().toISOString(),
          exchange: xDeath[0].exchange,
          routingKeys: xDeath[0]['routing-keys'],
        };
      }

      const orderId = payload.orderId || `DEAD-${Date.now().toString().slice(-6)}`;
      const deathRecord = {
        orderId,
        payload,
        rawContent,
        headers,
        deathReason: primaryDeath ? primaryDeath.reason : 'rejected',
        deathDetails: primaryDeath || { reason: 'rejected', queue: TOPOLOGY.QUEUES.MAIN },
        receivedAt: new Date().toISOString(),
        status: 'DEAD_LETTERED',
      };

      // Lưu trữ vào DLQ Registry để phục vụ Dashboard quản trị
      dlqRegistry.set(orderId, deathRecord);

      console.error(`\n⚰️ [DLQ Consumer] ĐÃ HỨNG ĐƯỢC TIN NHẮN TỬ VONG [${orderId}]!`);
      console.error(`   - Nguyên nhân chết (Reason): ${deathRecord.deathReason}`);
      console.error(`   - Nơi tử vong (Queue): ${deathRecord.deathDetails.queue}`);
      console.error(`   - Số lần chết (Count): ${deathRecord.deathDetails.count || 1}`);

      // Phát cảnh báo đỏ (Dead Letter Alert) tới tất cả kỹ sư qua Dashboard
      broadcastEvent('DEAD_LETTER_CAPTURED', {
        orderId,
        deathRecord,
        totalInDlq: dlqRegistry.size,
        message: `🚨 CẢNH BÁO DLQ: Tin nhắn [${orderId}] đã bị tử vong và rơi vào [${TOPOLOGY.QUEUES.DLQ}]! Cần kỹ sư kiểm tra nguyên nhân.`,
      });

      // Xác nhận ACK với RabbitMQ sau khi đã lưu trữ an toàn vào DLQ Registry
      channel.ack(msg);
    },
    {
      noAck: false,
    }
  );
}
