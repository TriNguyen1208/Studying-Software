import amqplib from 'amqplib';

// ============================================================================
// TOPOLOGY DEFINITION (TÊN EXCHANGES, QUEUES VÀ ROUTING KEYS CHUẨN DOANH NGHIỆP)
// ============================================================================
export const TOPOLOGY = {
  EXCHANGES: {
    MAIN: 'orders.direct',         // Exchange chính tiếp nhận đơn hàng
    RETRY: 'orders.retry.direct',   // Exchange định tuyến tin nhắn chờ retry
    DLX: 'orders.dlx',             // Dead Letter Exchange hứng tin nhắn hỏng/thất bại
  },
  QUEUES: {
    MAIN: 'orders.main.q',         // Hàng đợi chính Worker lắng nghe
    RETRY: 'orders.retry.q',       // Hàng đợi tạm có TTL để tạo độ trễ (Delayed Retry)
    DLQ: 'orders.dlq',             // Hàng đợi Dead Letter chứa tin nhắn tử vong
  },
  ROUTING_KEYS: {
    PROCESS: 'orders.process',     // Routing key cho đơn hàng hợp lệ cần xử lý
    RETRY: 'orders.retry',         // Routing key chuyển đơn vào hàng đợi retry
    DEAD: 'orders.dead',           // Routing key chuyển đơn vào DLQ
  },
  CONFIG: {
    MAX_RETRIES: 3,                // Số lần thử lại tối đa trước khi đưa vào DLQ
    RETRY_TTL_MS: 5000,            // Thời gian chờ (5s) trong hàng đợi Retry trước khi đẩy lại Main
  }
};

let connection = null;
let channel = null;

/**
 * Thiết lập kết nối RabbitMQ và khởi tạo Topology (Exchanges, Queues, DLX Bindings).
 * Áp dụng Connection Retry để phòng chống trường hợp Broker khởi động chậm.
 */
export async function connectRabbitMQ() {
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  const maxConnectAttempts = 10;
  let attempt = 0;

  while (attempt < maxConnectAttempts) {
    try {
      attempt++;
      console.log(`[RabbitMQ] Đang kết nối tới ${amqpUrl} (Lần ${attempt}/${maxConnectAttempts})...`);
      connection = await amqplib.connect(amqpUrl);
      
      connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err.message);
      });

      connection.on('close', () => {
        console.warn('[RabbitMQ] Connection đóng. Đang lên lịch kết nối lại sau 5s...');
        setTimeout(connectRabbitMQ, 5000);
      });

      channel = await connection.createChannel();
      
      // Giới hạn prefetch=1 để Worker xử lý tuần tự, công bằng (Fair Dispatch), không nuốt dồn message
      await channel.prefetch(1);

      // 1. Khởi tạo các Exchanges
      await channel.assertExchange(TOPOLOGY.EXCHANGES.MAIN, 'direct', { durable: true });
      await channel.assertExchange(TOPOLOGY.EXCHANGES.RETRY, 'direct', { durable: true });
      await channel.assertExchange(TOPOLOGY.EXCHANGES.DLX, 'direct', { durable: true });

      // 2. Khởi tạo Dead Letter Queue (DLQ)
      await channel.assertQueue(TOPOLOGY.QUEUES.DLQ, {
        durable: true,
      });
      await channel.bindQueue(TOPOLOGY.QUEUES.DLQ, TOPOLOGY.EXCHANGES.DLX, TOPOLOGY.ROUTING_KEYS.DEAD);

      // 3. Khởi tạo Retry Queue (Hàng đợi Delay dùng Message TTL + DLX trỏ ngược về Main)
      // Khi message ở trong queue này hết hạn (TTL), nó sẽ tự động bị dead-letter
      // sang Exchange MAIN với routing key PROCESS => Tự động quay về hàng đợi chính!
      await channel.assertQueue(TOPOLOGY.QUEUES.RETRY, {
        durable: true,
        arguments: {
          'x-message-ttl': TOPOLOGY.CONFIG.RETRY_TTL_MS,
          'x-dead-letter-exchange': TOPOLOGY.EXCHANGES.MAIN,
          'x-dead-letter-routing-key': TOPOLOGY.ROUTING_KEYS.PROCESS,
        }
      });
      await channel.bindQueue(TOPOLOGY.QUEUES.RETRY, TOPOLOGY.EXCHANGES.RETRY, TOPOLOGY.ROUTING_KEYS.RETRY);

      // 4. Khởi tạo Main Queue (Gắn cờ DLX trỏ sang orders.dlx)
      // Bất kỳ message nào bị nack(requeue=false) tại Main Queue sẽ tự động bay sang DLX
      await channel.assertQueue(TOPOLOGY.QUEUES.MAIN, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': TOPOLOGY.EXCHANGES.DLX,
          'x-dead-letter-routing-key': TOPOLOGY.ROUTING_KEYS.DEAD,
        }
      });
      await channel.bindQueue(TOPOLOGY.QUEUES.MAIN, TOPOLOGY.EXCHANGES.MAIN, TOPOLOGY.ROUTING_KEYS.PROCESS);

      console.log('✅ [RabbitMQ] Topology khởi tạo thành công (Main Queue, Retry Queue with TTL, và DLQ).');
      return { connection, channel };
    } catch (error) {
      console.error(`❌ [RabbitMQ] Kết nối thất bại ở lần ${attempt}:`, error.message);
      if (attempt >= maxConnectAttempts) {
        throw new Error(`Không thể kết nối RabbitMQ sau ${maxConnectAttempts} lần thử.`);
      }
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

export function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel chưa sẵn sàng. Hãy gọi connectRabbitMQ() trước.');
  }
  return channel;
}

export function getConnection() {
  return connection;
}
