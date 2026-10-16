/**
 * File: demo-onion-architecture.ts
 * Mô phỏng Kiến trúc Onion Architecture (Củ Hành) trong TypeScript.
 * Thể hiện rõ 4 lớp (Layers) và quy tắc phụ thuộc: Ngoài gọi Trong, Trong không biết Ngoài.
 */

// ============================================================================
// LỚP 1: DOMAIN MODEL LAYER (Tâm củ hành)
// Không phụ thuộc vào AI CẢ. Chứa trạng thái và logic nội tại của Thực thể.
// ============================================================================
class User {
    // Thuộc tính private để bảo vệ tính toàn vẹn của dữ liệu
    constructor(
        public readonly id: string,
        private _username: string,
        private _email: string,
        private _isActive: boolean = true
    ) {}

    // Hành vi nội tại của Entity
    public deactivate(): void {
        this._isActive = false;
    }

    public getEmail(): string {
        return this._email;
    }

    public getUsername(): string {
        return this._username;
    }
}

// ============================================================================
// LỚP 2: DOMAIN SERVICES LAYER (Vòng số 2)
// Các nghiệp vụ phức tạp thuần túy mà không thuộc về hẳn Entity nào. 
// (Trong ví dụ đơn giản này ta có thể gộp/bỏ qua, nhưng vẫn để đây để minh hoạ)
// ============================================================================
class UserDomainValidationService {
    public static isValidEmail(email: string): boolean {
        // Logic nghiệp vụ thuần túy, không gọi database
        return email.includes("@");
    }
}

// ============================================================================
// LỚP 3: APPLICATION SERVICES LAYER (Vòng số 3)
// Đóng vai trò làm Nhạc trưởng điều phối (Use Cases).
// Lớp này ĐỊNH NGHĨA CÁC INTERFACES (luật lệ) mà Lớp vỏ ngoài cùng phải tuân thủ.
// ============================================================================

// Interface này NẰM Ở LỚP 3. Lớp 3 cần ai đó lưu dữ liệu, nhưng nó không cần biết lưu vào đâu.
interface IUserRepository {
    save(user: User): Promise<void>;
    findByEmail(email: string): Promise<User | null>;
}

// Data Transfer Object (DTO) dùng để giao tiếp với vỏ ngoài (UI)
interface CreateUserRequest {
    username: string;
    email: string;
}

class UserApplicationService {
    // Ứng dụng Dependency Injection (DI)
    // Application Service chỉ nói chuyện qua Interface (IUserRepository).
    constructor(private userRepository: IUserRepository) {}

    // Đây là một Use Case
    public async registerUser(req: CreateUserRequest): Promise<string> {
        console.log(`[Lớp Application] Bắt đầu đăng ký user: ${req.email}`);
        
        // 1. Gọi Lớp 2 (Domain Service) để validate
        if (!UserDomainValidationService.isValidEmail(req.email)) {
            throw new Error("Email không hợp lệ theo quy tắc kinh doanh.");
        }

        // 2. Tương tác qua Interface (Không biết đang dùng SQL hay MongoDB)
        const existingUser = await this.userRepository.findByEmail(req.email);
        if (existingUser) {
            throw new Error("Email đã tồn tại.");
        }

        // 3. Khởi tạo Entity ở Lớp 1 (Domain Model)
        const newUser = new User(
            Math.random().toString(36).substring(7),
            req.username,
            req.email
        );

        // 4. Lưu lại qua Interface
        await this.userRepository.save(newUser);

        console.log(`[Lớp Application] Xong! Khởi tạo thành công.`);
        return newUser.id;
    }
}

// ============================================================================
// LỚP 4: INFRASTRUCTURE & UI LAYER (Lớp vỏ ngoài cùng)
// Công nghệ thực tế: SQL, MongoDB, Express, API... Lớp này Phụ thuộc vào các lớp trong.
// ============================================================================

// --- INFRASTRUCTURE (Thực thi cái Interface của Lớp 3 bằng mảng In-Memory) ---
class InMemoryUserRepository implements IUserRepository {
    private users: User[] = [];

    async save(user: User): Promise<void> {
        console.log(`[Lớp Infrastructure - DB] Đang Insert User vào bộ nhớ (Array)...`);
        this.users.push(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.users.find(u => u.getEmail() === email) || null;
    }
}

// --- UI / PRESENTATION (Giao diện API giả lập) ---
class UserController {
    constructor(private userAppService: UserApplicationService) {}

    // Giả lập hàm xử lý POST request từ HTTP Express
    public async handlePostRequest(body: any) {
        try {
            console.log(`\n[Lớp UI - Web] Nhận HTTP POST Request...`);
            const userId = await this.userAppService.registerUser(body);
            return { status: 201, message: "Created", id: userId };
        } catch (error: any) {
            console.log(`[Lớp UI - Web] Xảy ra lỗi: ${error.message}`);
            return { status: 400, error: error.message };
        }
    }
}

// ============================================================================
// GIAI ĐOẠN LẮP RÁP HỆ THỐNG (WIRING / BOOTSTRAP)
// Thường diễn ra ở file khởi động (ví dụ: index.ts)
// ============================================================================
async function main() {
    // 1. Tạo cục Infrastructure (Vỏ ngoài)
    const userRepository = new InMemoryUserRepository();
    
    // 2. Nhét cục Infrastructure vào cục Application (Tiêm phụ thuộc - Dependency Injection)
    const appService = new UserApplicationService(userRepository);
    
    // 3. Nhét cục Application vào cục UI (Web Controller)
    const uiController = new UserController(appService);

    // 4. Giả lập luồng người dùng gọi API
    await uiController.handlePostRequest({ username: "john_doe", email: "john@example.com" });
    
    // Test case lỗi trùng email
    await uiController.handlePostRequest({ username: "john_clone", email: "john@example.com" });
}

main();
