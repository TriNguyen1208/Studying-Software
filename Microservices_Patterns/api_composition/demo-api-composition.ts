/**
 * File: demo-api-composition.ts
 * Minh họa Anti-pattern: Gọi API tuần tự (Sequential) gây thắt cổ chai,
 * và Không bắt lỗi dẫn đến Sập toàn trang.
 */

// ============================================================================
// GIẢ LẬP 3 MICROSERVICES ĐỘC LẬP (Đang chạy ở 3 server khác nhau)
// ============================================================================
const MockUserService = {
    getUserInfo: async (id: string) => {
        await new Promise(r => setTimeout(r, 1000)); // Mất 1 giây
        return { name: "John Doe", email: "john@example.com" };
    }
};

const MockOrderService = {
    getRecentOrders: async (userId: string) => {
        await new Promise(r => setTimeout(r, 2000)); // Mất 2 giây
        return [{ id: "O_1", total: 500 }];
    }
};

const MockRewardService = {
    getLoyaltyPoints: async (userId: string) => {
        await new Promise(r => setTimeout(r, 1000)); // Mất 1 giây
        // GIẢ LẬP LỖI: Server tính điểm đang bị treo!
        throw new Error("LỖI KẾT NỐI SERVER ĐIỂM THƯỞNG");
    }
};


// ============================================================================
// API COMPOSER LỖI THỜI CỦA LẬP TRÌNH VIÊN TAY NGANG
// ============================================================================
export class BadApiComposer {
    public async getFullUserProfile(userId: string) {
        console.log(`[Composer] Bắt đầu gom dữ liệu cho User ${userId}...`);
        const startTime = Date.now();

        try {
            // LỖI 1: GỌI TUẦN TỰ (AWAIT TỪNG CÁI MỘT)
            // Phải chờ UserService (1s) xong, mới tới OrderService (2s), rồi mới tới RewardService (1s).
            // Tổng thời gian chờ: 4 giây! Quá chậm!
            const userInfo = await MockUserService.getUserInfo(userId);
            const orders = await MockOrderService.getRecentOrders(userId);
            
            // LỖI 2: KHÔNG CÓ GRACEFUL DEGRADATION
            // Hàm lấy điểm thưởng bị lỗi Exception. Hàm `try/catch` tổng sẽ bắt lấy lỗi này
            // và văng ra ngoài. Toàn bộ thông tin User và Order vừa lấy được vất đi hết!
            const points = await MockRewardService.getLoyaltyPoints(userId);

            const executionTime = (Date.now() - startTime) / 1000;
            console.log(`[Composer] Xong trong ${executionTime} giây`);
            
            return {
                ...userInfo,
                recentOrders: orders,
                points: points
            };
        } catch (error: any) {
            // Khách hàng nhận được 1 trang báo lỗi đỏ chóe 500. Dù thực chất chỉ có cái Điểm thưởng bị hư!
            console.error(`[Composer] API thất bại thảm hại. Lý do: ${error.message}`);
            return { error: "Lỗi hệ thống 500. Vui lòng quay lại sau." };
        }
    }
}

// --- CHẠY THỬ ---
async function runFail() {
    const composer = new BadApiComposer();
    const result = await composer.getFullUserProfile("U_99");
    console.log("Trả về cho Mobile App:", result); 
}

runFail();
