/**
 * File: answers-api-composition.ts
 * ĐÁP ÁN BÀI TẬP API COMPOSITION
 * 
 * Yêu cầu: Áp dụng gọi Song Song (Fan-out) bằng Promise.all.
 * Áp dụng Graceful Degradation (Fallback dữ liệu) để bảo vệ API không bị sập toàn cục.
 */

// ============================================================================
// GIẢ LẬP MICROSERVICES (Giữ nguyên như đề bài)
// ============================================================================
const MockUserService = {
    getUserInfo: async (id: string) => {
        await new Promise(r => setTimeout(r, 1000)); 
        return { name: "John Doe", email: "john@example.com" };
    }
};
const MockOrderService = {
    getRecentOrders: async (userId: string) => {
        await new Promise(r => setTimeout(r, 2000)); 
        return [{ id: "O_1", total: 500 }];
    }
};
const MockRewardService = {
    getLoyaltyPoints: async (userId: string) => {
        await new Promise(r => setTimeout(r, 1000)); 
        throw new Error("LỖI KẾT NỐI SERVER ĐIỂM THƯỞNG"); // Vẫn báo lỗi
    }
};


// ============================================================================
// API COMPOSER ĐƯỢC THIẾT KẾ ĐÚNG CHUẨN MICROSERVICES
// ============================================================================
export class GoodApiComposer {
    public async getFullUserProfile(userId: string) {
        console.log(`\n[Composer Tối Ưu] Bắt đầu gom dữ liệu cho User ${userId}...`);
        const startTime = Date.now();

        // 1. ÁP DỤNG GRACEFUL DEGRADATION CHO TỪNG SERVICE BẤT ỔN
        // Tạo một hàm bọc (wrapper). Nếu gọi RewardService lỗi, trả về "0" thay vì ném Exception ra ngoài.
        const safeGetPoints = async (id: string) => {
            try {
                return await MockRewardService.getLoyaltyPoints(id);
            } catch (err) {
                console.warn(`[Warning] Không lấy được điểm thưởng. Hiển thị 0 tạm thời.`);
                return 0; // Giá trị mặc định (Fallback)
            }
        };

        // Cũng làm tương tự với OrderService nếu muốn an toàn 100%
        const safeGetOrders = async (id: string) => {
            try {
                return await MockOrderService.getRecentOrders(id);
            } catch (err) {
                return []; // Mặc định chưa có đơn hàng nào
            }
        };

        // 2. ÁP DỤNG FAN-OUT (GỌI SONG SONG)
        // Cả 3 request chạy CÙNG MỘT LÚC đua với nhau.
        // Thời gian chờ tổng cộng = Max(1s, 2s, 1s) = 2s.
        const [userInfo, orders, points] = await Promise.all([
            MockUserService.getUserInfo(userId), // Buộc phải thành công (nếu lỗi thì rớt ráng chịu)
            safeGetOrders(userId),               // Chấp nhận lỗi
            safeGetPoints(userId)                // Chấp nhận lỗi
        ]);

        const executionTime = (Date.now() - startTime) / 1000;
        console.log(`[Composer Tối Ưu] Xong trong ${executionTime} giây (Nhanh gấp đôi!)`);
        
        // 3. NHÀO NẶN LẠI DỮ LIỆU
        return {
            ...userInfo,
            recentOrders: orders,
            loyaltyPoints: points
        };
    }
}

// --- CHẠY THỬ ---
async function runSuccess() {
    const composer = new GoodApiComposer();
    const result = await composer.getFullUserProfile("U_99");
    
    // KẾT QUẢ: 
    // - Xong chỉ trong 2 giây.
    // - Dữ liệu vẫn ra đầy đủ Tên, Đơn hàng. Điểm thưởng tự động fallback về 0. Trải nghiệm người dùng không hề bị đứt gãy!
    console.log("\nTrả về cho Mobile App:", result); 
}

runSuccess();
