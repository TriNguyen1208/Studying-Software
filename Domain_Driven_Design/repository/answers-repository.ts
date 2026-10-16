/**
 * File: answers-repository.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH REPOSITORY PATTERN
 * 
 * Yêu cầu: Cô lập (Isolate) Logic DB ra khỏi Domain Entity bằng cách
 * áp dụng Repository Pattern và Dependency Inversion.
 */

// ============================================================================
// 1. DOMAIN LAYER (TẦNG LÕI) - THUẦN KHIẾT 100%
// ============================================================================

// Entity giờ đây hoàn toàn trong sạch, không chứa một chút SQL nào.
export class PureUser {
    constructor(
        public readonly id: string,
        public name: string
    ) {}

    public changeName(newName: string) {
        if (!newName) throw new Error("Tên không hợp lệ");
        this.name = newName;
    }
}

// BẢN HỢP ĐỒNG (INTERFACE) DO DOMAIN ĐỊNH NGHĨA
// Domain tuyên bố: "Tôi cần ai đó triển khai 2 hàm này cho tôi, viết bằng công nghệ gì tôi không quan tâm!"
export interface IUserRepository {
    save(user: PureUser): Promise<void>;
    findById(id: string): Promise<PureUser | null>;
}


// ============================================================================
// 2. INFRASTRUCTURE LAYER (TẦNG HẠ TẦNG)
// ============================================================================

// Repository thực thi Hợp đồng bằng công nghệ SQL (Postgres).
export class PostgresUserRepository implements IUserRepository {
    async save(user: PureUser): Promise<void> {
        console.log(`[Repository - Postgres] Đang lưu User [${user.name}] xuống bảng 'users' bằng lệnh SQL...`);
    }

    async findById(id: string): Promise<PureUser | null> {
        console.log(`[Repository - Postgres] Đang query SELECT * FROM users WHERE id = ${id}...`);
        return new PureUser(id, "Mocked User");
    }
}

// Một Repository khác thực thi bằng File JSON. (Minh chứng cho sức mạnh dễ thay thế)
export class JsonFileUserRepository implements IUserRepository {
    async save(user: PureUser): Promise<void> {
        console.log(`[Repository - JSON File] Đang ghi User [${user.name}] vào file user_db.json...`);
    }

    async findById(id: string): Promise<PureUser | null> {
        return null;
    }
}


// ============================================================================
// 3. APPLICATION SERVICE (TẦNG ĐIỀU PHỐI) - SỬ DỤNG REPOSITORY
// ============================================================================
class UserAppService {
    // Chỉ phụ thuộc vào Interface (Lõi), không phụ thuộc vào Postgres (Hạ tầng)
    constructor(private readonly userRepo: IUserRepository) {}

    public async executeRename(userId: string, newName: string) {
        // 1. Lấy Entity từ DB lên (Lúc này không biết nó lấy từ SQL hay JSON)
        const user = await this.userRepo.findById(userId);
        if (!user) throw new Error("Không tìm thấy user");

        // 2. Thao tác Logic nghiệp vụ (Thuần khiết)
        user.changeName(newName);

        // 3. Lưu lại trạng thái
        await this.userRepo.save(user);
    }
}

// ============================================================================
// CHẠY THỬ (WIRING)
// ============================================================================
async function runTest() {
    console.log("=== CHẠY MÔ HÌNH REPOSITORY ===");

    // Ta hoàn toàn có thể "Rút rắc" cắm Postgres, và "Cắm rắc" JSON File vào tùy ý.
    const repo = new PostgresUserRepository(); // Hoặc: new JsonFileUserRepository();
    const service = new UserAppService(repo);

    await service.executeRename("U1", "Alice Wonderland");
}

runTest();
