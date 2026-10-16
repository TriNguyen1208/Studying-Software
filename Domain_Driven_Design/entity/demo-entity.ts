/**
 * File: demo-entity.ts
 * Minh họa Anti-pattern: So sánh sai bản chất của một Entity (Dùng Structural Equality).
 */

export class UserEntity {
    public id: string;
    public name: string;
    public email: string;
    public age: number;

    constructor(id: string, name: string, email: string, age: number) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.age = age;
    }

    // ============================================================================
    // VẤN ĐỀ: SO SÁNH SAI BẢN CHẤT ENTITY (DÙNG KIỂU CỦA VALUE OBJECT)
    // Lập trình viên đang kiểm tra xem tên, tuổi, email có y chang nhau không.
    // ============================================================================
    public isSameUser_BAD(otherUser: UserEntity): boolean {
        console.log(`[Anti-Pattern] Đang so sánh theo toàn bộ thuộc tính...`);
        return this.name === otherUser.name 
            && this.email === otherUser.email 
            && this.age === otherUser.age;
    }
}

// --- CHẠY THỬ ĐỂ THẤY LỖI ---
function testFail() {
    // Tình huống: Bob tạo tài khoản, có ID là 1.
    const bobTruocKhiDoiTen = new UserEntity("ID_001", "Bob Smith", "bob@gmail.com", 25);
    
    // Một năm sau, Bob sửa thông tin đổi tên thành Bob The Builder, tuổi lên 26.
    // Lưu ý: Vẫn là ID_001 (Vì vẫn là cái tài khoản đó của Bob!)
    const bobHienTai = new UserEntity("ID_001", "Bob The Builder", "bob@gmail.com", 26);

    // Một thanh niên trùng tên Bob Smith đăng ký tài khoản mới (ID_999).
    const bobPhaKe = new UserEntity("ID_999", "Bob Smith", "bob@gmail.com", 25);

    // Kiểm tra xem hệ thống có nhận diện đúng người không:
    
    // 1. So sánh Bob quá khứ và Bob hiện tại
    const isSame1 = bobTruocKhiDoiTen.isSameUser_BAD(bobHienTai);
    console.log(`Bob 2022 và Bob 2023 có phải là một người? -> ${isSame1}`); // RA FALSE! Sai hoàn toàn, họ là 1 người!

    // 2. So sánh Bob quá khứ và Bob giả mạo
    const isSame2 = bobTruocKhiDoiTen.isSameUser_BAD(bobPhaKe);
    console.log(`Bob 2022 và Bob Fake (ID_999) có phải là một người? -> ${isSame2}`); // RA TRUE! Cực kỳ nguy hiểm, cấp quyền nhầm người!
}

testFail();
