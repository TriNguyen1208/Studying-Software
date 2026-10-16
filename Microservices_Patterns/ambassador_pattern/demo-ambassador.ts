/**
 * File: demo-ambassador.ts
 * Minh họa Anti-pattern: Ứng dụng tự gánh vác việc xử lý hạ tầng mạng (Network).
 * Gây trùng lặp code và làm bẩn logic nghiệp vụ.
 */

// Hàm giả lập việc kết nối ra API nước ngoài (Thường xuyên chập chờn)
const FlakyExternalApi = async () => {
    const random = Math.random();
    if (random > 0.3) {
        throw new Error("Lỗi Connection Timeout!"); // 70% là rớt mạng
    }
    return "SUCCESS_DATA";
};


// ============================================================================
// VẤN ĐỀ: ỨNG DỤNG LÕI PHẢI TỰ CODE LOGIC RETRY (THỬ LẠI)
// ============================================================================
class LegacyApplication {
    
    public async processPayment() {
        console.log(`[Business] Bắt đầu tính toán tiền nong...`);

        // LỖI THIẾT KẾ: Code nghiệp vụ bị chèn ép bởi code Hạ tầng mạng (Vòng lặp Retry)
        let success = false;
        let retries = 3;

        while (retries > 0 && !success) {
            try {
                console.log(`  -> Thử kết nối API ngoài... (Còn ${retries} lần)`);
                // Ứng dụng tự kết nối ra Internet
                const result = await FlakyExternalApi();
                success = true;
                console.log(`[Business] Thanh toán thành công! Dữ liệu: ${result}`);
            } catch (error: any) {
                console.error(`  -> Lỗi mạng: ${error.message}`);
                retries--;
                if (retries === 0) {
                    console.error("[Business] THẤT BẠI HOÀN TOÀN TỪ BỎ!");
                }
            }
        }
    }
}

// --- CHẠY THỬ ---
async function run() {
    const app = new LegacyApplication();
    await app.processPayment();
}

run();
