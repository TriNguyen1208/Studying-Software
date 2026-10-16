/**
 * File: demo-cqrs.ts
 * Minh họa Anti-pattern: Mô hình CRUD truyền thống.
 * Gộp chung luồng Đọc và luồng Ghi vào cùng 1 Service và 1 Model.
 */

// Domain Entity chung (Vừa để ghi, vừa để đọc)
class UserEntity {
    constructor(
        public id: string,
        public name: string,
        public secretPasswordHash: string,
        public failedLoginAttempts: number
    ) {}

    public updateName(newName: string) {
        if (!newName) throw new Error("Invalid name");
        this.name = newName;
    }
}

// Một class làm tất ăn cả
export class UserCrudService {
    private db: UserEntity[] = []; // Giả lập DB

    // LUỒNG GHI (COMMAND)
    public createUser(name: string, pass: string): void {
        console.log(`[CRUD] Đang chạy qua Entity để kiểm duyệt...`);
        const newUser = new UserEntity("U1", name, pass, 0);
        this.db.push(newUser);
    }

    // LUỒNG ĐỌC (QUERY)
    // Vấn đề 1: Phải query ra NGUYÊN CỤC Entity nặng nề (bao gồm các hàm logic)
    // Vấn đề 2: Dễ vô tình làm lộ dữ liệu nhạy cảm (password, login attempts) ra màn hình UI.
    public getUserProfileForUI(id: string): UserEntity | null {
        console.log(`[CRUD] Phải lôi nguyên cái Entity từ DB lên để hiển thị...`);
        const user = this.db.find(u => u.id === id);
        return user || null; 
    }
}

// --- CHẠY THỬ ---
const service = new UserCrudService();
service.createUser("Alice", "hash123");
const profile = service.getUserProfileForUI("U1");

console.log("Dữ liệu ném ra màn hình:", profile); 
// In ra: { id: 'U1', name: 'Alice', secretPasswordHash: 'hash123', failedLoginAttempts: 0 }
// Nguy hiểm! UI không cần password hay số lần login thất bại.
