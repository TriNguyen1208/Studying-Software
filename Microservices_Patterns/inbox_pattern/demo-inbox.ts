/**
 * File: demo-inbox.ts
 * Minh họa Anti-pattern: Hệ thống quá ngây thơ tin tưởng Message Broker.
 * Không xử lý tính Lũy đẳng (Idempotency), dẫn đến bị Double-charge (Trừ tiền 2 lần).
 */

class BadPaymentService {
    private userBalance = 1000; // Khách đang có 1000$

    // Hứng event từ Kafka
    public async handleIncomingEvent(event: any) {
        console.log(`[Service] Nhận được Event ${event.id}: Trừ ${event.amount}$ của Khách...`);
        
        // NGÂY THƠ CẢ TIN: Nhận được là bay vào làm ngay! Không thèm check gì cả.
        this.userBalance -= event.amount;
        
        console.log(`[Service] Đã trừ tiền xong! Số dư còn lại: ${this.userBalance}`);
    }
}


// ============================================================================
// CHẠY THỬ: THẢM HỌA MẠNG CHẬP CHỜN
// ============================================================================
async function runFail() {
    const app = new BadPaymentService();

    const EVENT_ID_1 = "EVT_001_DEDUCT_200";

    console.log("--- KAFKA GỬI LẦN 1 ---");
    await app.handleIncomingEvent({ id: EVENT_ID_1, amount: 200 }); // Dư 800

    console.log("\n--- MẠNG BỊ LAGGING... KAFKA TƯỞNG APP CHƯA NHẬN ĐƯỢC... ---");
    console.log("--- KAFKA GỬI LẠI LẦN 2 (Duplicate Message) ---");
    
    // Cùng 1 cái ID đó, nhưng nó bị bãnh tới 2 lần!
    await app.handleIncomingEvent({ id: EVENT_ID_1, amount: 200 }); 
    // Dư 600!!! Khách hàng mất oan 200$ vì hệ thống bị "Ngáo".
}

runFail();
