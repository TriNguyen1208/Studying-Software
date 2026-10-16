/**
 * File: answers-acl.ts
 * ĐÁP ÁN BÀI TẬP ANTI-CORRUPTION LAYER (ACL)
 * 
 * Yêu cầu: Dựng bức tường kiểm dịch ACL đứng giữa.
 * Dịch dữ liệu BẨN thành dữ liệu SẠCH (Ubiquitous Language) trước khi đưa vào lõi.
 */

const LegacyERP_API = {
    fetchCustomerData: async () => {
        return { usr_nme: "Bob Smith", t: 1, d: "1990-01-01" };
    }
};

// ============================================================================
// 1. DATA MODEL CHUẨN CỦA HỆ THỐNG MỚI (UBIQUITOUS LANGUAGE)
// Dễ đọc, dễ hiểu, đậm chất nghiệp vụ.
// ============================================================================
interface CleanCustomerDTO {
    fullName: string;
    isVip: boolean;
    dateOfBirth: Date;
}

// ============================================================================
// 2. LỚP CHỐNG THAM NHŨNG (ANTI-CORRUPTION LAYER)
// Chịu trách nhiệm dọn rác, phiên dịch. Nằm ở rìa ngoài của kiến trúc.
// ============================================================================
class ERPTranslatorACL {
    
    public async getCleanCustomerInfo(): Promise<CleanCustomerDTO> {
        console.log(`\n[ACL] Đang lấy data bẩn từ Legacy...`);
        const dirtyData = await LegacyERP_API.fetchCustomerData();

        console.log(`[ACL] Bức tường kiểm dịch đang Phiên dịch (Translate) sang chuẩn mới...`);
        // THÔNG DỊCH VIÊN:
        const cleanData: CleanCustomerDTO = {
            fullName: dirtyData.usr_nme,          // Đổi tên
            isVip: dirtyData.t === 1,             // Biến con số ma thuật (Magic number) thành Boolean
            dateOfBirth: new Date(dirtyData.d)    // Ép kiểu chuẩn chỉnh
        };

        return cleanData;
    }
}


// ============================================================================
// 3. HỆ THỐNG MỚI (TRONG SÁNG, THUẦN KHIẾT 100%)
// ============================================================================
class PureModernApp {
    private acl = new ERPTranslatorACL();

    public async processDiscount() {
        console.log(`[Hệ thống Mới] Bắt đầu tính khuyến mãi...`);
        
        // Chỉ nhận Dữ liệu ĐÃ QUA KIỂM DỊCH
        const customer = await this.acl.getCleanCustomerInfo();

        // LOGIC NGHIỆP VỤ CỰC KỲ DỄ ĐỌC (Như ngôn ngữ tự nhiên)
        if (customer.isVip) {
            console.log(`Cấp mã giảm giá VIP cho khách hàng ${customer.fullName}`);
        } else {
            console.log(`Cấp mã thường cho khách hàng ${customer.fullName}`);
        }
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
async function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH LỚP CHỐNG THAM NHŨNG (ACL) ===");
    const app = new PureModernApp();
    await app.processDiscount();
    
    // Bất kỳ sự thay đổi dơ bẩn nào từ hệ thống cũ (Ví dụ: nó đổi `t` thành `type`)
    // Ta chỉ việc vào sửa cái Class ACL. Code lõi của `PureModernApp` hoàn toàn bất tử.
}

runSuccess();
