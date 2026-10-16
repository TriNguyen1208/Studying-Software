/**
 * File: answers-inbox.ts
 * ĐÁP ÁN BÀI TẬP INBOX PATTERN
 * 
 * Yêu cầu: Xây dựng con Idempotent Receiver bằng cách kiểm tra bảng Inbox.
 * Chặn đứng mọi tin nhắn gửi trùng từ Broker.
 */

class GoodPaymentService {
    private userBalance = 1000;
    
    // GIẢ LẬP BẢNG INBOX TRONG DATABASE SQL
    // Ở hệ thống thật, Cột ID này phải có cờ UNIQUE CONSTRAINT.
    private inboxDatabaseTable: string[] = []; 

    public async handleIncomingEvent(event: any) {
        console.log(`\n[Service] Nhận Event ${event.id} từ Kafka...`);

        // ====================================================================
        // BƯỚC 1: KIỂM TRA INBOX TRƯỚC TIÊN (LỌC THƯ RÁC)
        // ====================================================================
        if (this.inboxDatabaseTable.includes(event.id)) {
            console.log(`[Inbox Pattern] CẢNH BÁO: Phát hiện tin nhắn trùng lặp (ID: ${event.id})! Bỏ qua ngay lập tức.`);
            return; // Đã xử lý rồi, về đi! Đừng trừ tiền nữa!
        }

        // ====================================================================
        // BƯỚC 2: XỬ LÝ NGHIỆP VỤ & LƯU INBOX TRONG CÙNG 1 TRANSACTION
        // ====================================================================
        try {
            // (Tưởng tượng đoạn code này được bọc trong BEGIN TRANSACTION)
            
            // 2a. Lưu vào Inbox (Để lần sau Kafka gửi tới thì biết đường mà chặn)
            this.inboxDatabaseTable.push(event.id);
            
            // 2b. Xử lý nghiệp vụ chính
            this.userBalance -= event.amount;
            console.log(`[Business] Đã trừ ${event.amount}$. Số dư còn lại: ${this.userBalance}`);

            // (Tưởng tượng đoạn code này gọi COMMIT TRANSACTION)
        } catch (error) {
            // (Tưởng tượng gọi ROLLBACK)
            console.error("Lỗi nội bộ");
        }
    }
}


// ============================================================================
// CHẠY THỬ
// ============================================================================
async function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH INBOX PATTERN (CHỐNG TRÙNG LẶP) ===");
    const app = new GoodPaymentService();

    const EVENT_ID_1 = "EVT_001_DEDUCT_200";

    console.log("--- KAFKA GỬI LẦN 1 ---");
    await app.handleIncomingEvent({ id: EVENT_ID_1, amount: 200 }); 
    // Thành công. Trừ 200$. Dư 800$.

    console.log("--- KAFKA LỖI MẠNG, GỬI LẠI LẦN 2 ---");
    await app.handleIncomingEvent({ id: EVENT_ID_1, amount: 200 }); 
    // Hệ thống chặn đứng kịp thời. Báo lỗi trùng lặp. Số dư vẫn an toàn là 800$!

    console.log("\n--- KAFKA GỬI TIN MỚI (LẦN 3) ---");
    const EVENT_ID_2 = "EVT_002_DEDUCT_50";
    await app.handleIncomingEvent({ id: EVENT_ID_2, amount: 50 }); 
    // Là tin hoàn toàn mới. Xử lý thành công. Trừ 50$. Dư 750$.
}

runSuccess();
