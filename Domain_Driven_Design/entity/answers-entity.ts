/**
 * File: answers-entity.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH ENTITY
 * 
 * Yêu cầu: Viết lại phương thức so sánh bằng (equals) chuẩn theo định nghĩa của Entity:
 * Chỉ quan tâm tới IDENTITY (Định danh), phớt lờ mọi thay đổi về State (Trạng thái).
 */

export class StandardEntity {
    public readonly id: string;
    public name: string;
    public age: number;

    constructor(id: string, name: string, age: number) {
        if (!id) throw new Error("Entity bắt buộc phải có ID khi khởi tạo!");
        this.id = id;
        this.name = name;
        this.age = age;
    }

    // ============================================================================
    // ĐÁP ÁN: IDENTITY EQUALITY
    // ============================================================================
    public equals(otherEntity?: StandardEntity | null): boolean {
        // 1. Kỹ thuật fail-fast: Tránh so sánh với null/undefined
        if (otherEntity === null || otherEntity === undefined) {
            return false;
        }

        // 2. Tối ưu bộ nhớ: Nếu chúng trỏ chung vào cùng 1 ô nhớ (Reference), chắc chắn bằng nhau.
        if (this === otherEntity) {
            return true;
        }

        // 3. Quy tắc tối thượng của Entity: Bằng nhau NẾU VÀ CHỈ NẾU ID bằng nhau!
        // Cho dù name hay age có bị đổi thành cái gì đi nữa.
        return this.id === otherEntity.id;
    }
}

// --- TEST CHẠY THỬ (INTEGRATION TEST) ---
function testSuccess() {
    console.log("\n=== KIỂM TRA CHUẨN ENTITY EQUALITY ===");
    
    // Tình huống tương tự:
    const bobTruocKhiDoiTen = new StandardEntity("ID_001", "Bob Smith", 25);
    const bobHienTai = new StandardEntity("ID_001", "Bob The Builder", 26);
    const bobPhaKe = new StandardEntity("ID_999", "Bob Smith", 25);

    // 1. So sánh Bob quá khứ và Bob hiện tại
    const isSame1 = bobTruocKhiDoiTen.equals(bobHienTai);
    console.log(`Bob 2022 và Bob 2023 có phải là một người? -> ${isSame1}`); // TRUE! (Đúng chuẩn, tài khoản ID_001 vẫn là của Bob)

    // 2. So sánh Bob quá khứ và Bob giả mạo
    const isSame2 = bobTruocKhiDoiTen.equals(bobPhaKe);
    console.log(`Bob 2022 và Bob Fake (ID_999) có phải là một người? -> ${isSame2}`); // FALSE! (Chặn đứng giả mạo)
}

testSuccess();
