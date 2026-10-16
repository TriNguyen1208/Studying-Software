/**
 * File: demo-repository.ts
 * Minh họa Anti-pattern (đối với DDD): Active Record.
 * Mô hình này gộp chung Logic DB vào trong Domain Entity. Rất khó để Unit Test.
 */

// ============================================================================
// VẤN ĐỀ: ACTIVE RECORD B LÀM BẨN DOMAIN MODEL
// Class User (vốn nên là Domain thuần túy) lại đi chứa logic kết nối DB.
// ============================================================================
class ActiveUser {
    public id: string;
    public name: string;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    // Logic nghiệp vụ (Kinh doanh)
    public changeName(newName: string) {
        if (!newName) throw new Error("Tên không hợp lệ");
        this.name = newName;
    }

    // ==========================================
    // LOGIC INFRASTRUCTURE (LƯU TRỮ DB) NẰM SAI CHỖ
    // ==========================================
    public async saveToSQL() {
        console.log(`[Active Record] Đang mở kết nối SQL...`);
        console.log(`[Active Record] INSERT INTO users (id, name) VALUES ('${this.id}', '${this.name}')`);
        // Khuyết điểm 1: Nếu muốn đổi sang MongoDB, phải sửa thẳng vào class User này.
        // Khuyết điểm 2: Không thể viết Unit Test cho hàm changeName() mà không bị dính cái lỗi thiếu kết nối SQL!
    }
}

// --- CHẠY THỬ ---
async function runActiveRecord() {
    console.log("=== CHẠY MÔ HÌNH ACTIVE RECORD ===");
    const user = new ActiveUser("U1", "Alice");
    
    user.changeName("Alice Wonderland");
    
    // Tự thân nó lưu nó xuống DB
    await user.saveToSQL(); 
}

runActiveRecord();
