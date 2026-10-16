import { getChannel, TOPOLOGY } from '../config/rabbitmq.js';
import { publishToRetry, broadcastEvent } from '../services/queueService.js';

/**
 * Worker chính tiêu thụ và xử lý đơn hàng từ Main Queue (`orders.main.q`).
 * Minh họa chân thực 3 nhánh rẽ vận hành của Dead Letter Queue:
 * 1. Happy Path -> Xử lý thành công -> ACK (Xác nhận hoàn tất).
 * 2. Lỗi hiểm độc (Poison Pill) -> NACK với requeue=false -> Bay thẳng vào DLQ!
 * 3. Lỗi tạm thời (Transient) -> Chuyển vào Retry Queue với TTL 5s -> Sau 3 lần vẫn lỗi -> Đưa vào DLQ!
 */
export async function startOrderWorker() {
  const channel = getChannel();

  console.log(`🚀 [Order Worker] Đang lắng nghe trên queue [${TOPOLOGY.QUEUES.MAIN}]...`);

  await channel.consume(
    TOPOLOGY.QUEUES.MAIN,
    async (msg) => {
      if (!msg) return;

      const rawContent = msg.content.toString();
      let payload;
      let headers = msg.properties.headers || {};
      let currentRetryCount = headers['x-retry-count'] || 0;

      try {
        payload = JSON.parse(rawContent);
      } catch (err) {
        // [TRƯỜNG HỢP 1]: POISON PILL DO DỮ LIỆU BỊ HỎNG (MALFORMED JSON)
        // Dữ liệu không parse nổi, tuyệt đối KHÔNG retry vì có thử lại 100 vạn lần vẫn lỗi!
        console.error(`🚨 [Order Worker] Phát hiện Malformed JSON Poison Pill! NACK requeue=false -> Đẩy thẳng vào DLQ.`);
        
        broadcastEvent('PROCESSING_ERROR', {
          errorType: 'POISON_PILL_SYNTAX',
          message: 'Dữ liệu tin nhắn bị lỗi cú pháp JSON. Từ chối xử lý và đưa thẳng vào DLQ.',
          rawContent,
        });

        // Nack với requeue=false: RabbitMQ lập tức kích hoạt DLX và chuyển tin nhắn vào DLQ!
        channel.nack(msg, false, false);
        return;
      }

      console.log(`\n📦 [Order Worker] Nhận đơn hàng [${payload.orderId}], Kịch bản: [${payload.scenario}], Attempt: ${currentRetryCount + 1}`);

      broadcastEvent('PROCESSING_STARTED', {
        orderId: payload.orderId,
        item: payload.item,
        amount: payload.amount,
        scenario: payload.scenario,
        retryCount: currentRetryCount,
        message: `Worker đang xử lý đơn hàng [${payload.orderId}]... (Thử lần: ${currentRetryCount + 1})`,
      });

      // Giả lập thời gian xử lý I/O thực tế (500ms)
      await new Promise((res) => setTimeout(res, 500));

      // ======================================================================
      // [TRƯỜNG HỢP 2]: POISON PILL DO NGHIỆP VỤ LỖI VĨNH VIỄN (BUSINESS INVALID)
      // ======================================================================
      // Ví dụ: Số tiền âm, sản phẩm không tồn tại, user bị khóa tài khoản vĩnh viễn.
      if (payload.scenario === 'poison_pill' || (payload.amount !== undefined && payload.amount <= 0)) {
        const poisonReason = payload.amount <= 0 
          ? `Số tiền thanh toán bất hợp lệ (${payload.amount} <= 0)`
          : `Poison Pill: Dữ liệu chứa mã độc hại hoặc thiếu trường dữ liệu cốt lõi`;

        console.error(`☠️ [Order Worker] Phát hiện Poison Pill tại đơn [${payload.orderId}]: ${poisonReason}. NACK requeue=false -> Chuyển sang DLQ!`);

        broadcastEvent('POISON_PILL_DETECTED', {
          orderId: payload.orderId,
          reason: poisonReason,
          payload,
          message: `Worker phát hiện Poison Pill: "${poisonReason}". Lập tức NACK requeue=false để tránh nghẽn hàng đợi (Head-of-Line Blocking).`,
        });

        // BẮT BUỘC: nack(msg, false, false) để RabbitMQ tự động đẩy vào orders.dlq
        channel.nack(msg, false, false);
        return;
      }

      // ======================================================================
      // [TRƯỜNG HỢP 3]: LỖI TẠM THỜI (TRANSIENT FAULT) CẦN RETRY CÓ ĐỘ TRỄ
      // ======================================================================
      // Ví dụ: Cổng thanh toán bên thứ ba Timeout (HTTP 504), Database bị gián đoạn.
      if (payload.scenario === 'transient_fail') {
        if (currentRetryCount < TOPOLOGY.CONFIG.MAX_RETRIES) {
          // Chưa vượt quá số lần retry tối đa:
          // 1. Xác nhận đã lấy khỏi Main Queue (ACK)
          // 2. Đẩy sang Retry Queue với TTL 5s để tạo khoảng thở phục hồi
          console.warn(`⏳ [Order Worker] Đơn hàng [${payload.orderId}] gặp lỗi Timeout cổng thanh toán (Lần ${currentRetryCount + 1}/${TOPOLOGY.CONFIG.MAX_RETRIES}). Chuyển vào Retry Queue với TTL ${TOPOLOGY.CONFIG.RETRY_TTL_MS}ms.`);
          
          channel.ack(msg); // Lấy ra khỏi Main queue để không nghẽn các đơn hàng phía sau!
          
          await publishToRetry(
            payload,
            currentRetryCount,
            `Cổng thanh toán phản hồi Timeout (504 Gateway Timeout)`
          );
          return;
        } else {
          // Đã thử lại 3 lần mà vẫn lỗi: Hết đường cứu vãn tạm thời!
          // Chuyển sang trạng thái Tử Vong -> Đẩy vào DLQ để kỹ sư can thiệp thủ công!
          console.error(`💀 [Order Worker] Đơn hàng [${payload.orderId}] đã retry quá số lần cho phép (${TOPOLOGY.CONFIG.MAX_RETRIES} lần). Đưa vào DLQ!`);

          broadcastEvent('MAX_RETRIES_EXCEEDED', {
            orderId: payload.orderId,
            retries: currentRetryCount,
            payload,
            message: `Đơn hàng [${payload.orderId}] đã thử lại ${currentRetryCount} lần thất bại. Đưa vào DLQ để bảo toàn dữ liệu.`,
          });

          // Nack requeue=false để bay vào DLQ
          channel.nack(msg, false, false);
          return;
        }
      }

      // ======================================================================
      // [TRƯỜNG HỢP 4]: HAPPY PATH - XỬ LÝ ĐƠN HÀNG THÀNH CÔNG RỰC RỠ
      // ======================================================================
      console.log(`✅ [Order Worker] Xử lý đơn hàng [${payload.orderId}] thành công. Gửi ACK hoàn tất.`);

      channel.ack(msg);

      broadcastEvent('PROCESSING_SUCCESS', {
        orderId: payload.orderId,
        item: payload.item,
        amount: payload.amount,
        processedAt: new Date().toISOString(),
        message: `Đơn hàng [${payload.orderId}] đã được thanh toán và xuất hóa đơn thành công! (Worker ACK)`,
      });
    },
    {
      noAck: false, // BẮT BUỘC: false để yêu cầu Manual Acknowledgment, đảm bảo không rơi rớt message
    }
  );
}
