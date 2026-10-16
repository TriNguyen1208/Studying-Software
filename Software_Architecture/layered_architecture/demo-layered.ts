/**
 * File: demo-layered.ts
 * Mô phỏng Kiến trúc 3 Lớp (Layered Architecture / N-Tier).
 * Đặc trưng: Lớp trên gọi trực tiếp lớp dưới (Top-Down).
 */

// ============================================================================
// LỚP 3: DATA ACCESS LAYER (Lớp kết nối CSDL)
// Dưới cùng, chuyên nói chuyện với Database.
// ============================================================================
class UserRepository {
    // Giả lập kết nối vào SQL Database
    public async saveToSQL(userData: any): Promise<boolean> {
        console.log(`[DAL] Đang thực thi câu lệnh: INSERT INTO users VALUES (...) với data: ${userData.username}`);
        return true;
    }

    public async checkExistsInSQL(email: string): Promise<boolean> {
        console.log(`[DAL] Đang thực thi SELECT * FROM users WHERE email='${email}'`);
        // Giả sử không có email trùng
        return false;
    }
}

// ============================================================================
// LỚP 2: BUSINESS LOGIC LAYER (Lớp Nghiệp vụ)
// Ở giữa, lấy dữ liệu từ Lớp 1, xử lý, rồi đẩy xuống Lớp 3.
// ============================================================================
class UserService {
    // VẤN ĐỀ ANTI-PATTERN: TIGHT COUPLING (Khớp nối chặt)
    // UserService tự tay tạo ra UserRepository. Nó bị trói chặt vào CSDL SQL.
    private userRepository = new UserRepository();

    public async register(username: string, email: string) {
        console.log(`\n[BLL] Bắt đầu quy trình đăng ký cho ${email}...`);
        
        // 1. Logic nghiệp vụ: Validate email
        if (!email.includes('@')) {
            throw new Error("Email không hợp lệ");
        }

        // 2. Logic nghiệp vụ: Check trùng email qua Lớp 3
        const isExists = await this.userRepository.checkExistsInSQL(email);
        if (isExists) {
            throw new Error("Tài khoản đã tồn tại");
        }

        // 3. Logic nghiệp vụ: Lưu xuống DB qua Lớp 3
        const isSuccess = await this.userRepository.saveToSQL({ username, email });
        console.log(`[BLL] Hoàn tất đăng ký.`);
        return isSuccess;
    }
}

// ============================================================================
// LỚP 1: PRESENTATION LAYER (Lớp Giao diện / API)
// Trển cùng, nhận Request từ người dùng và đẩy xuống Lớp 2.
// ============================================================================
class UserController {
    // Lớp 1 gọi Lớp 2
    private userService = new UserService();

    // Giả lập HTTP Route (Ví dụ: POST /register)
    public async handleRegisterRequest(req: any) {
        console.log(`[UI] Nhận HTTP POST request: /register`);
        try {
            const { username, email } = req.body;
            await this.userService.register(username, email);
            return { status: 200, message: "Thành công" };
        } catch (error: any) {
            return { status: 400, message: error.message };
        }
    }
}

// ============================================================================
// KHỞI CHẠY ỨNG DỤNG
// ============================================================================
async function run() {
    const controller = new UserController();
    // Người dùng bấm nút trên Web -> Gửi Request tới Controller
    await controller.handleRegisterRequest({ 
        body: { username: "Tritran", email: "tri@example.com" } 
    });
}

run();
