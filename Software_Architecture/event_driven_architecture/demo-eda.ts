/**
 * File: demo-eda.ts
 * Minh họa Anti-pattern (Tight Coupling): Gọi API đồng bộ (Synchronous Call).
 */

// ============================================================================
// HỆ THỐNG EMAIL (SERVICE B)
// ============================================================================
class EmailServiceAPI {
    public async sendEmail(email: string, content: string) {
        console.log(`[Email Service] Đang gửi mail cho ${email}...`);
        
        // GIẢ LẬP: Mạng bị đứt, hoặc server gửi mail bị crash
        const isNetworkDown = true; 
        if (isNetworkDown) {
            throw new Error("LỖI MẠNG BÊN DỊCH VỤ EMAIL!");
        }
        
        console.log(`[Email Service] Gửi thành công.`);
    }
}

// ============================================================================
// HỆ THỐNG ĐẶT HÀNG (SERVICE A)
// ============================================================================
class BadOrderService {
    // Tight Coupling: OrderService "biết" quá nhiều về EmailService
    private emailApi = new EmailServiceAPI(); 

    public async createOrder(orderId: string, email: string) {
        console.log(`\n[Order Service] Đang xử lý lưu đơn hàng ${orderId}...`);
        console.log(`[Order Service] Lưu đơn vào DB thành công! Tiền đã trừ.`);

        try {
            // GỌI ĐỒNG BỘ: Chờ hệ thống Email chạy xong thì hàm này mới kết thúc
            await this.emailApi.sendEmail(email, "Cảm ơn bạn đã mua hàng.");
            
            console.log(`[Order Service] Trả kết quả thành công cho Khách hàng.`);
            return { status: "SUCCESS" };
        } catch (error: any) {
            // HẬU QUẢ NGHIÊM TRỌNG: Lỗi của thằng Email làm thằng Order bị CRASH THEO!
            // Giao diện web xoay mòng mòng báo lỗi 500, khách hoang mang tưởng chưa đặt hàng xong (Dù tiền đã trừ).
            console.error(`[Order Service] Bị vạ lây vì hệ thống khác: ${error.message}`);
            return { status: "FAIL", error: error.message };
        }
    }
}

// --- CHẠY THỬ ---
async function runFail() {
    const service = new BadOrderService();
    await service.createOrder("ORD_99", "bob@gmail.com");
}

runFail();
