/**
 * File: demo-application-service.ts
 * Minh họa Anti-pattern: Controller (Lớp UI) gánh vác quá nhiều trách nhiệm.
 * Bỏ qua Application Service, Controller tự tay điều phối DB và Domain.
 */

// ============================================================================
// CÁC THÀNH PHẦN HỖ TRỢ (GIẢ LẬP)
// ============================================================================
class User {
    constructor(public id: string, public email: string) {}
    // Logic của Domain
    public changePassword(newPass: string) { /* ... */ }
}

class UserRepository {
    async findByEmail(email: string): Promise<User | null> { return null; }
    async save(user: User): Promise<void> { console.log(`Đã lưu ${user.email} vào DB`); }
}

// ============================================================================
// VẤN ĐỀ: FAT CONTROLLER (API TRỞ NÊN QUÁ CỒNG KỀNH VÀ PHỨC TẠP)
// ============================================================================
export class BadUserController {
    private userRepo = new UserRepository();

    // Hàm hứng HTTP POST (VD: req.body = { email: "abc@gmail" })
    public async handleRegisterApi(req: any) {
        console.log(`[Controller] Nhận HTTP POST request /api/users...`);
        
        try {
            // LỖI THIẾT KẾ 1: Controller phải parse JSON thô (req.body), không có DTO ràng buộc
            const { email, password } = req.body;
            
            // LỖI THIẾT KẾ 2: Controller tự tay gọi DB kiểm tra (Logic điều phối bị lộ ra ngoài UI)
            const existingUser = await this.userRepo.findByEmail(email);
            if (existingUser) {
                return { status: 400, message: "Email đã tồn tại" };
            }

            // LỖI THIẾT KẾ 3: Controller tự khởi tạo Domain Entity
            const newUser = new User("NEW_ID", email);
            newUser.changePassword(password); // Gọi nghiệp vụ

            // LỖI THIẾT KẾ 4: Controller tự lưu DB
            await this.userRepo.save(newUser);

            // Gửi Event, Gửi Email... tất cả đều dồn vào Controller. 
            // KHÔNG THỂ RE-USE (Tái sử dụng) code này nếu sau này ta làm thêm giao diện CLI (Dòng lệnh).

            return { status: 201, data: newUser }; // Lỗi 5: Ném thẳng Entity ra ngoài màn hình!
            
        } catch (error: any) {
            return { status: 500, message: "Lỗi server" };
        }
    }
}
