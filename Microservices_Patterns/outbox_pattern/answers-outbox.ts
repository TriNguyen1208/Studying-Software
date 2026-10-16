/**
 * File: answers-outbox.ts
 * ĐÁP ÁN BÀI TẬP OUTBOX PATTERN
 * 
 * Yêu cầu: Không bắn Kafka trực tiếp. Lưu Event vào bảng Outbox cùng lúc với Order.
 * Dùng Worker chạy ngầm để từ từ chuyển Outbox sang Kafka.
 */

// ============================================================================
// HẠ TẦNG (GIẢ LẬP)
// ============================================================================
const SQL_Database = {
    ordersTable: [] as any[],
    outboxTable: [] as any[],

    // Điểm cốt lõi: TRANSACTION. Nếu 1 trong 2 cái lỗi, cả 2 sẽ bị hủy. Đảm bảo toàn vẹn.
    transactionalSave: function(order: any, outboxEvent: any) {
        this.ordersTable.push(order);
        this.outboxTable.push(outboxEvent);
        console.log(`[SQL DB Transaction] Đã lưu thành công Order và Outbox Event cùng 1 lượt!`);
    }
};

const Kafka_Broker = {
    publishEvent: async (event: any) => {
        // Có thể chập chờn, nhưng không sao, Worker sẽ retry.
        console.log(`[Kafka] Đã nhận tin nhắn: ${event.type} - ${event.payload}`);
    }
};


// ============================================================================
// 1. BUSINESS SERVICE (Nghiệp vụ - Chỉ làm việc nội bộ với DB)
// ============================================================================
class GoodOrderService {
    public async createOrder(orderId: string, item: string) {
        console.log("\n=== KHÁCH ĐẶT MÓN ===");
        
        // Tạo Event cần gửi
        const event = { 
            id: Math.random().toString(), 
            type: 'OrderCreated', 
            payload: JSON.stringify({ orderId, item }),
            status: 'PENDING'
        };

        // Lưu cả 2 vào DB chung 1 Transaction. Không bao giờ sợ rớt mạng Internet.
        SQL_Database.transactionalSave({ id: orderId, item }, event);
        
        // Báo khách thành công ngay lập tức! Web load siêu nhanh.
        return { status: "SUCCESS" };
    }
}


// ============================================================================
// 2. BACKGROUND WORKER (Message Relay)
// Chạy ngầm độc lập ở 1 file khác. Có nhiệm vụ quét bảng Outbox.
// ============================================================================
class OutboxWorker {
    public startPolling() {
        // Cứ mỗi 2 giây quét DB 1 lần
        setInterval(async () => {
            const pendingEvents = SQL_Database.outboxTable.filter(e => e.status === 'PENDING');
            if (pendingEvents.length === 0) return;

            console.log(`\n[Worker] Phát hiện ${pendingEvents.length} Event tồn đọng trong Outbox. Bắt đầu gửi...`);

            for (const event of pendingEvents) {
                try {
                    // Gửi qua Kafka (Internet)
                    await Kafka_Broker.publishEvent(event);
                    
                    // Gửi xong thì xóa (hoặc đánh dấu Done) trong DB
                    event.status = 'PROCESSED';
                    console.log(`[Worker] Gửi OK. Đã dọn dẹp Outbox.`);
                } catch (err) {
                    console.error(`[Worker] Lỗi mạng khi gửi Kafka. Bỏ qua, lần quét sau (2s nữa) sẽ gửi lại!`);
                }
            }
        }, 2000);
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
async function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH OUTBOX PATTERN ===");

    // Bật Worker chạy ngầm
    const worker = new OutboxWorker();
    worker.startPolling();

    // Người dùng tạo đơn hàng
    const app = new GoodOrderService();
    await app.createOrder("ORD_1", "Phở Bò");
    await app.createOrder("ORD_2", "Trà Đá");

    // Xem log terminal để thấy cách Worker hoạt động lững thững đằng sau lưng.
}

runSuccess();
