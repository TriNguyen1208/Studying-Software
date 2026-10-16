/**
 * File: demo-value-object.ts
 * Minh họa Anti-pattern: Primitive Obsession (Ám ảnh kiểu nguyên thủy).
 * Code rườm rà, thiếu tính bao gói (Encapsulation).
 */

// ============================================================================
// VẤN ĐỀ: KHÔNG SỬ DỤNG VALUE OBJECT
// ============================================================================
class BadUser {
    public id: string;
    public name: string;
    
    // Rải rác 3 biến primitive thay vì gom lại. 
    // Hậu quả 1: Class User ngày càng phình to nếu có thêm lat, long, country...
    public street: string;
    public city: string;
    public zipCode: string;

    constructor(id: string, name: string, street: string, city: string, zipCode: string) {
        this.id = id;
        this.name = name;
        this.street = street;
        this.city = city;
        this.zipCode = zipCode;
    }

    // Hậu quả 2: Thiếu tính BẤT BIẾN (Immutability).
    // Ai ở bên ngoài cũng có thể gọi: user.city = "New City";
    // Hậu quả 3: Không có nơi tập trung để Validate (Kiểm tra lỗi) zipcode. 
    // Nếu có class Order cũng cần địa chỉ, ta lại phải copy code check zipcode sang đó.
}

// Hàm so sánh 2 địa chỉ của 2 người xem có ở chung nhà không.
// Nếu không có Value Object, ta phải tự so sánh TỪNG biến một vô cùng thủ công.
function checkSameHouse(user1: BadUser, user2: BadUser): boolean {
    return user1.street === user2.street 
        && user1.city === user2.city 
        && user1.zipCode === user2.zipCode;
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
const userA = new BadUser("U1", "Alice", "123 Main St", "NY", "10001");
const userB = new BadUser("U2", "Bob", "123 Main St", "NY", "10001");

console.log("Ở chung nhà?", checkSameHouse(userA, userB)); // true

// Kẻ gian sửa trực tiếp thành phố của Alice (Lỗi Mutation)
userA.city = ""; // Lẽ ra không được phép để trống, nhưng không có logic bảo vệ
console.log("Alice giờ ở thành phố:", userA.city); // Trống rỗng
