/**
 * File: answers-ambassador.ts
 * ĐÁP ÁN BÀI TẬP AMBASSADOR PATTERN
 * 
 * Yêu cầu: Đẩy toàn bộ trách nhiệm giao tiếp mạng (Retry, Timeout) 
 * cho một lớp Đại sứ (Ambassador) xử lý.
 */

const FlakyExternalApi = async () => {
    const random = Math.random();
    if (random > 0.3) throw new Error("Lỗi Connection Timeout!"); 
    return "SUCCESS_DATA";
};

// ============================================================================
// 1. AMBASSADOR (ĐẠI SỨ) - Chuyên gia Ngoại giao
// Nằm ở cổng localhost. Chuyên xử lý mạng, bảo mật, retry.
// ============================================================================
class NetworkAmbassador {
    
    // Hứng request localhost, đại diện đi ngoại giao
    public async callPaymentGateway(): Promise<string> {
        let retries = 3;
        while (retries > 0) {
            try {
                console.log(`[Ambassador] Bọc Token bảo mật. Thử bắn ra biển lớn... (Còn ${retries} lần)`);
                const result = await FlakyExternalApi();
                return result; // Thành công thì trả về ngay
            } catch (error: any) {
                console.error(`[Ambassador] Mạng rớt. Tự động Retry ngầm...`);
                retries--;
                // Giả lập ngủ 1 giây trước khi retry (Backoff)
                await new Promise(r => setTimeout(r, 100)); 
            }
        }
        throw new Error("Ambassador bó tay. Mạng đứt cáp mập cắn hoàn toàn.");
    }
}

const localAmbassador = new NetworkAmbassador(); // Chạy ngầm trong Pod


// ============================================================================
// 2. MAIN APPLICATION (Ứng dụng chính) - Ngây thơ & Trong sáng
// ============================================================================
class ModernApplication {
    
    public async processPayment() {
        console.log(`\n[Business] Tính toán đơn hàng 100$...`);
        
        try {
            // TUYỆT VỜI: Ứng dụng chính KHÔNG HỀ BIẾT về vòng lặp Retry. 
            // Nó chỉ việc gọi Localhost (Ambassador) và rung đùi đợi kết quả.
            const result = await localAmbassador.callPaymentGateway();
            
            console.log(`[Business] Khớp lệnh thành công! Dữ liệu: ${result}`);
        } catch (error: any) {
            // Lỗi đến tay App là lỗi không thể cứu vãn (Cắt cầu dao)
            console.error(`[Business] Hủy đơn hàng vì lỗi hệ thống: ${error.message}`);
        }
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
async function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH AMBASSADOR ===");
    const app = new ModernApplication();
    await app.processPayment();
}

runSuccess();
