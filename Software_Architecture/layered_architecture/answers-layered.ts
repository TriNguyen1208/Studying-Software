/**
 * File: answers-layered.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH LAYERED ARCHITECTURE
 * 
 * Yêu cầu: Gỡ bỏ Tight Coupling (Khớp nối chặt) ở lớp UserService
 * bằng cách áp dụng Dependency Injection (DI) qua Constructor.
 */

// Giữ nguyên lớp DAL
class UserRepository {
    public async saveToSQL(userData: any): Promise<boolean> { return true; }
    public async checkExistsInSQL(email: string): Promise<boolean> { return false; }
}

// ============================================================================
// ĐÁP ÁN: SỬA LỚP BUSINESS LOGIC (BLL)
// ============================================================================
class UserServiceOptimized {
    // 1. Không dùng "new UserRepository()" ở đây nữa!
    private userRepository: UserRepository;

    // 2. Bắt buộc người tạo (người gọi hàm) phải TRUYỀN (Inject) cục Repository vào.
    // Lợi ích: Khi test, ta có thể dễ dàng truyền vào một Cục Repository GIẢ (Mock).
    constructor(repo: UserRepository) {
        this.userRepository = repo;
    }

    public async register(username: string, email: string) {
        console.log(`[BLL Optimized] Đăng ký cho ${email}...`);
        // Vẫn sử dụng this.userRepository bình thường
        await this.userRepository.checkExistsInSQL(email);
        await this.userRepository.saveToSQL({ username, email });
        return true;
    }
}

// ============================================================================
// SỬA LẠI LỚP PRESENTATION (UI)
// ============================================================================
class UserControllerOptimized {
    private userService: UserServiceOptimized;

    constructor() {
        // 3. Khởi tạo và "cắm rắc" (Wire up) ở lớp cao nhất
        const repo = new UserRepository();
        this.userService = new UserServiceOptimized(repo); // Truyền DB vào Service
    }

    public async handleRegisterRequest(req: any) {
        await this.userService.register(req.body.username, req.body.email);
    }
}

// ============================================================================
// LỢI ÍCH BỔ SUNG: DỄ DÀNG VIẾT UNIT TEST
// ============================================================================
function runUnitTest() {
    console.log("\n--- CHẠY UNIT TEST MÀ KHÔNG CẦN DATABASE THẬT ---");
    
    // Tạo 1 Cục Database Giả (Mock Database) - Luôn báo là email đã tồn tại
    class MockUserRepository extends UserRepository {
        public async checkExistsInSQL(email: string): Promise<boolean> {
            return true; // Giả lập DB trả về true
        }
    }

    // Nhét cục giả vào UserService. UserService không hề hay biết!
    const mockRepo = new MockUserRepository();
    const serviceForTest = new UserServiceOptimized(mockRepo);

    // Chạy hàm và mong đợi nó báo lỗi (Vì email đã tồn tại)
    serviceForTest.register("test", "test@gmail.com")
        .catch(err => console.log(`[Test Kết Quả] Chạy test thành công. Nhận lỗi đúng dự đoán: Tồn tại`));
}

runUnitTest();
