/**
 * File: answers-saga.ts
 * ĐÁP ÁN BÀI TẬP SAGA PATTERN
 * 
 * Yêu cầu: Viết một Saga Orchestrator. Quản lý trạng thái từng bước.
 * Nếu có lỗi ở bước nào, kích hoạt quy trình Đền bù (Compensate) cho các bước trước đó.
 */

// Giả lập Microservices có thêm các hàm Đền bù (Refund / Undo)
const PaymentService = {
    deductMoney: async (userId: string, amount: number) => {
        console.log(`[Payment] Đã trừ ${amount}$ từ ví.`);
        return true;
    },
    // HÀM ĐỀN BÙ
    refundMoney: async (userId: string, amount: number) => {
        console.log(`[Payment - ĐỀN BÙ] Đã hoàn trả lại ${amount}$ vào ví cho User.`);
        return true;
    }
};

const RideService = {
    bookDriver: async (userId: string) => {
        console.log(`[Ride] Đang tìm tài xế...`);
        throw new Error("Không tìm thấy tài xế nào!"); // Lỗi!
    }
};

// ============================================================================
// SAGA ORCHESTRATOR (NGƯỜI NHẠC TRƯỞNG QUẢN LÝ QUY TRÌNH)
// ============================================================================
class BookingSagaOrchestrator {
    
    public async execute(userId: string) {
        console.log("=== SAGA BẮT ĐẦU: ĐẶT XE ===");
        
        // Theo dõi xem bước nào đã làm thành công để biết đường mà đền bù
        let isMoneyDeducted = false;

        try {
            // Bước 1: Trừ tiền
            await PaymentService.deductMoney(userId, 50);
            isMoneyDeducted = true; // Đánh dấu đã thành công bước 1

            // Bước 2: Book xe
            await RideService.bookDriver(userId);

            console.log("[Saga] Hoàn thành xuất sắc 100%!");
            return { status: "SUCCESS" };

        } catch (error: any) {
            console.error(`\n[Saga] Lỗi bất ngờ: ${error.message}`);
            console.log(`[Saga] KÍCH HOẠT QUY TRÌNH ĐỀN BÙ (COMPENSATION)...`);

            // THỰC HIỆN ĐỀN BÙ NGƯỢC LẠI TỪ DƯỚI LÊN
            if (isMoneyDeducted) {
                try {
                    await PaymentService.refundMoney(userId, 50);
                } catch (refundError) {
                    // Nếu quá xui xẻo, hàm hoàn tiền cũng bị sập mạng?
                    // -> Phải lưu vào Database trạng thái "Nợ khách 50$" để chạy Cronjob quét và bù sau.
                    console.error("[CRITICAL] Không thể hoàn tiền! Cần can thiệp thủ công!");
                }
            }

            console.log("[Saga] Đã an toàn phục hồi trạng thái như chưa có gì xảy ra.");
            return { status: "FAIL", reason: error.message };
        }
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
async function runSuccess() {
    const saga = new BookingSagaOrchestrator();
    await saga.execute("U123");
    
    // KẾT QUẢ: 
    // Dù lỗi hết xe xảy ra, khách hàng vẫn được hệ thống tự động hoàn lại tiền. 
    // Trải nghiệm người dùng tuyệt vời, không bị thiệt hại.
}

runSuccess();
