/**
 * File: answers-application-service.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH APPLICATION SERVICE
 * 
 * Yêu cầu: Tách việc điều phối (Orchestration) ra khỏi Controller.
 * Tạo ra một Application Service (Use Case) độc lập để tái sử dụng.
 * Dùng DTO cho Input/Output.
 */

// ============================================================================
// 1. CÁC THÀNH PHẦN DOMAIN / INFRA (Giả lập để code chạy được)
// ============================================================================
class User {
    constructor(public id: string, public email: string) {}
    public changePassword(newPass: string) { console.log("Hash mật khẩu..."); }
}
class UserRepository {
    async findByEmail(email: string): Promise<User | null> { return null; }
    async save(user: User): Promise<void> { console.log(`[Repository] Đã lưu ${user.email} vào DB`); }
}

// ============================================================================
// 2. DATA TRANSFER OBJECTS (DTOs)
// Lớp vỏ bọc an toàn để truyền dữ liệu qua lại giữa Web/UI và Application.
// ============================================================================
export interface RegisterUserRequestDTO {
    email: string;
    pass: string;
}

export interface RegisterUserResponseDTO {
    id: string;
    email: string;
    // Bưng bít không trả về password hay các trường nội bộ của Entity
}

// ============================================================================
// 3. APPLICATION SERVICE (USE CASE)
// Trái tim điều phối của ứng dụng. Độc lập hoàn toàn với Giao diện Web (HTTP, Express).
// Có thể gọi cái này từ API, từ Cron Job, hoặc từ Dòng lệnh (CLI).
// ============================================================================
export class UserRegistrationAppService {
    constructor(private userRepo: UserRepository) {}

    // Nhận DTO, Trả DTO. Không làm lộ Entity.
    public async execute(req: RegisterUserRequestDTO): Promise<RegisterUserResponseDTO> {
        console.log(`[App Service] Bắt đầu luồng đăng ký tài khoản cho ${req.email}...`);

        // 1. Giao tiếp DB
        const existingUser = await this.userRepo.findByEmail(req.email);
        if (existingUser) {
            throw new Error("Email đã được sử dụng");
        }

        // 2. Khởi tạo Domain
        const newUser = new User("ID_XYZ", req.email);
        
        // 3. Ủy quyền xử lý nghiệp vụ cho Domain
        newUser.changePassword(req.pass);

        // 4. Lưu lại
        await this.userRepo.save(newUser);

        // 5. Bắn sự kiện (Gửi mail welcome) - (Thường viết thêm ở đây)

        // 6. Map (Chuyển đổi) Entity sang DTO rồi mới trả về an toàn
        return {
            id: newUser.id,
            email: newUser.email
        };
    }
}


// ============================================================================
// 4. CONTROLLER (UI LAYER) - GIỜ ĐÂY TRỞ NÊN SIÊU MỎNG (THIN CONTROLLER)
// ============================================================================
export class GoodUserController {
    // Inject (cắm) cái Service vào
    constructor(private registerUseCase: UserRegistrationAppService) {}

    public async handleRegisterApi(httpReq: any) {
        console.log(`\n[Controller] Nhận HTTP POST /api/users...`);
        try {
            // 1. Validate định dạng JSON và map sang DTO
            const dto: RegisterUserRequestDTO = {
                email: httpReq.body.email,
                pass: httpReq.body.password
            };

            // 2. Đẩy cho Nhạc trưởng xử lý
            const result = await this.registerUseCase.execute(dto);

            // 3. Trả về cho Client
            console.log(`[Controller] Thành công! Trả JSON về Browser.`);
            return { status: 201, data: result };

        } catch (error: any) {
            return { status: 400, message: error.message };
        }
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
async function run() {
    console.log("=== KIẾN TRÚC SỬ DỤNG APPLICATION SERVICE CHUẨN ===");
    const repo = new UserRepository();
    const appService = new UserRegistrationAppService(repo);
    const controller = new GoodUserController(appService);

    await controller.handleRegisterApi({ 
        body: { email: "coder@gmail.com", password: "123" } 
    });
}

run();
