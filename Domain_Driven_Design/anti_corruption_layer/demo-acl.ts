/**
 * File: demo-acl.ts
 * Minh họa Anti-pattern: Bị lây nhiễm sự "dơ bẩn" (Corrupted) từ hệ thống cũ.
 */

// ============================================================================
// HỆ THỐNG LEGACY CŨ KỸ (20 năm tuổi, viết bằng một ngôn ngữ thời tiền sử)
// ============================================================================
const LegacyERP_API = {
    fetchCustomerData: async () => {
        // Trả về một cục JSON tối nghĩa, sai chính tả, vi phạm mọi quy chuẩn đặt tên
        return {
            usr_nme: "Bob Smith", // Đáng lẽ phải là fullName
            t: 1,                 // 1 là VIP, 0 là Normal (Rất khó hiểu)
            d: "1990-01-01"       // Date of birth
        };
    }
};

// ============================================================================
// VẤN ĐỀ: HỆ THỐNG MỚI (MODERN APP) BỊ CHẤP NHẬN SỰ Ô NHIỄM
// Kỹ sư mới vào đọc đoạn code này sẽ không hiểu "t === 1" nghĩa là cái quái gì.
// ============================================================================
class CorruptedModernApp {
    
    public async processDiscount() {
        console.log(`[Hệ thống Mới] Lấy data khách hàng...`);
        
        // Móc data bẩn vào thẳng hệ thống
        const rawData = await LegacyERP_API.fetchCustomerData();

        // LOGIC NGHIỆP VỤ BỊ VẤY BẨN:
        // Đáng lẽ ta phải viết if (customer.isVip), thì ta lại phải viết (rawData.t === 1)
        if (rawData.t === 1) {
            console.log(`Cấp mã giảm giá VIP cho ${rawData.usr_nme}`);
        } else {
            console.log(`Cấp mã thường cho ${rawData.usr_nme}`);
        }
    }
}

// --- CHẠY THỬ ---
async function runFail() {
    const app = new CorruptedModernApp();
    await app.processDiscount(); 
    // Hệ thống chạy ĐÚNG logic, nhưng THỐI về mặt kiến trúc. 
    // Lớp Domain (Kinh doanh) đã bị Corrupted (Lây nhiễm) thuật ngữ lạ.
}

runFail();
