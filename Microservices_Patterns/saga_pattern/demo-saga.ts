/**
 * File: demo-saga.ts
 * Minh họa Anti-pattern: Bỏ quên giao dịch đền bù (Compensating Transaction) 
 * trong môi trường Microservices phân tán.
 */

// ============================================================================
// GIẢ LẬP MICROSERVICES
// ============================================================================
const PaymentService = {
    deductMoney: async (userId: string, amount: number) => {
        console.log(`[Payment] Đã trừ ${amount}$ từ ví của User ${userId}`);
        return true;
    }
};

const RideService = {
    bookDriver: async (userId: string) => {
        console.log(`[Ride] Đang tìm tài xế...`);
        // GIẢ LẬP LỖI: Trời mưa, tất cả tài xế đều bận.
        throw new Error("Không tìm thấy tài xế nào!"); 
    }
};

// ============================================================================
// VẤN ĐỀ: MẤT TIỀN CỦA KHÁCH VÌ KHÔNG CÓ CƠ CHẾ ROLLBACK
// ============================================================================
class NaiveBookingService {

    public async bookARide(userId: string) {
        console.log("=== BẮT ĐẦU ĐẶT XE ===");
        try {
            // Bước 1: Trừ tiền (Chạy thành công, tiền đã mất)
            await PaymentService.deductMoney(userId, 50);

            // Bước 2: Book xe (Bị lỗi văng Exception)
            await RideService.bookDriver(userId);

            console.log("Chuyến đi đã sẵn sàng!");

        } catch (error: any) {
            // LỖI CHẾT NGƯỜI: Chỉ in ra câu xin lỗi, mà không trả lại 50$ cho khách!!!
            // Ở Monolith, ta có thể ghi db.rollback(), nhưng đây là 2 con server API khác nhau.
            console.error(`[LỖI] Rất tiếc: ${error.message}`);
        }
    }
}

// --- CHẠY THỬ ---
async function runFail() {
    const service = new NaiveBookingService();
    await service.bookARide("U123");
    
    console.log("\nHẬU QUẢ: Khách không có xe đi, mà bị trừ mất 50$ trong thẻ. Chuẩn bị ăn kiện!");
}

runFail();
