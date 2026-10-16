/**
 * File: answers-cqrs.ts
 * ĐÁP ÁN BÀI TẬP CQRS
 * 
 * Yêu cầu: Tách biệt hoàn toàn luồng Command (Ghi) và luồng Query (Đọc).
 * Mỗi luồng sử dụng mô hình phù hợp nhất với nó.
 */

// ============================================================================
// 1. LUỒNG COMMAND (GHI) - TẬP TRUNG VÀO DOMAIN LOGIC
// ============================================================================

// Write Model (Entity bảo vệ logic)
class UserDomainEntity {
    constructor(
        private id: string,
        private name: string,
        private passwordHash: string
    ) {}

    public saveToDB() {
        console.log(`[Command DB] Đã Insert/Update vào SQL Database bằng ORM (Có Transaction).`);
        // (Giả lập việc Message Broker đồng bộ data sang ElasticSearch cho luồng Query đọc)
    }
}

// Command Handler (Chỉ làm thao tác thay đổi)
export class CreateUserCommandHandler {
    public execute(name: string, pass: string): void {
        console.log(`\n[Command Handler] Chạy logic nghiệp vụ ngặt nghèo...`);
        
        // Khởi tạo Entity để nó tự validate chính nó
        const user = new UserDomainEntity("U_100", name, pass);
        
        user.saveToDB(); 
        // LƯU Ý: Không return (trả về) dữ liệu của User ở đây. 
        // Chỉ ném exception nếu lỗi, hoặc thành công (void).
    }
}

// ============================================================================
// 2. LUỒNG QUERY (ĐỌC) - TẬP TRUNG VÀO TỐC ĐỘ VÀ DTO HIỂN THỊ
// ============================================================================

// Read Model / DTO (Gọn nhẹ, không có hàm logic, không có trường nhạy cảm)
interface UserProfileDTO {
    id: string;
    fullName: string;
}

// Query Handler (Chỉ lấy dữ liệu)
export class GetUserProfileQueryHandler {
    
    // Hàm này KHÔNG dùng Entity hay Repository của DDD.
    // Nó "bypass" (vượt rào) để chọc thẳng vào DB đọc siêu tốc.
    public execute(userId: string): UserProfileDTO {
        console.log(`\n[Query Handler] Vượt rào Entity, chọc SQL thô (hoặc ElasticSearch) để móc JSON ra!`);
        
        // Giả lập câu Query SQL thô: 
        // `SELECT id, name as fullName FROM read_database.users WHERE id = '${userId}'`
        
        const rawDataFromDB = {
            id: userId,
            fullName: "Alice Wonderland"
            // Hoàn toàn không dính dáng đến password!
        };

        return rawDataFromDB;
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
function runCQRS() {
    console.log("=== CHẠY CQRS ===");

    // 1. Bên xử lý chức năng Đăng Ký (Write)
    const cmdHandler = new CreateUserCommandHandler();
    cmdHandler.execute("Alice", "hashed_pwd_999");

    // 2. Bên xử lý màn hình Trang Cá Nhân (Read)
    const queryHandler = new GetUserProfileQueryHandler();
    const dto = queryHandler.execute("U_100");

    console.log("Dữ liệu an toàn ném ra UI:", dto); 
    // In ra: { id: 'U_100', fullName: 'Alice Wonderland' }
}

runCQRS();
