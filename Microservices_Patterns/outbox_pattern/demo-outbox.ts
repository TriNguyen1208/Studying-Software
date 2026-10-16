/**
 * File: demo-outbox.ts
 * Minh họa Anti-pattern: Dual Write (Lỗi ghi kép).
 * Chữ "Dual" nghĩa là cố gắng ghi vào 2 cái thùng chứa không liên quan gì với nhau, dẫn đến thảm họa rách dữ liệu.
 */

// ============================================================================
// GIẢ LẬP HẠ TẦNG
// ============================================================================
const SQL_Database = {
    saveOrder: async (order: any) => { console.log(`[SQL] Đã lưu Order ${order.id}`); }
};

const Kafka_Broker = {
    publishEvent: async (event: any) => {
        // GIẢ LẬP: Mạng chập chờn, Kafka bị đơ.
        throw new Error("KAFKA TIMEOUT!");
    }
};

// ============================================================================
// VẤN ĐỀ: DUAL WRITE GÂY MẤT ĐỒNG BỘ DỮ LIỆU CỰC NGUY HIỂM
// ============================================================================
class BadOrderService {

    public async createOrder(orderId: string, item: string) {
        console.log("=== KHÁCH ĐẶT MÓN ===");
        try {
            // HÀNH ĐỘNG 1: Lưu vào DB cục bộ (Thành công mĩ mãn)
            await SQL_Database.saveOrder({ id: orderId, item });

            // HÀNH ĐỘNG 2: Báo cho nhà bếp (Lỗi sập mạng!)
            console.log("[Service] Đang báo cho Nhà bếp qua Kafka...");
            await Kafka_Broker.publishEvent({ type: 'OrderCreated', id: orderId });

            return { status: "SUCCESS" };

        } catch (error: any) {
            // LỖI CHẾT NGƯỜI: 
            // Dù code nhảy vào CATCH và báo lỗi lên màn hình Điện thoại khách hàng...
            // NHƯNG DATA TRONG SQL_Database VẪN CÒN ĐÓ! TIỀN KHÁCH VẪN BỊ TRỪ!
            // Và nhà bếp thì KHÔNG BAO GIỜ nhận được thông báo để nấu ăn.
            
            console.error(`[LỖI] ${error.message}`);
            return { status: "FAIL" }; 
        }
    }
}

// --- CHẠY THỬ ---
async function runFail() {
    const app = new BadOrderService();
    await app.createOrder("ORD_1", "Phở Bò");
    console.log("-> Khách chờ mòn mỏi 1 tiếng nhưng nhà bếp không nấu vì Event rớt giữa đường!");
}

runFail();
