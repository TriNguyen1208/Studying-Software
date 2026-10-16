/**
 * File: answers-value-object.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH VALUE OBJECT
 * 
 * Yêu cầu: Đóng gói các biến rời rạc thành Value Object "Address".
 * Áp dụng tính Bất biến (Immutability) và Structural Equality.
 */

// ============================================================================
// ĐÁP ÁN 1: TẠO VALUE OBJECT ADDRESS
// ============================================================================
class Address {
    // 1. TÍNH BẤT BIẾN (IMMUTABILITY): Biến thành readonly. 
    // Không có setter. Một khi đã tạo là không thể sửa đổi.
    constructor(
        public readonly street: string,
        public readonly city: string,
        public readonly zipCode: string
    ) {
        // 2. TỰ ĐÓNG GÓI LOGIC KIỂM DƯYỆT (Validation)
        // Bất kỳ ai cần xài Address đều được hưởng sái logic này mà không cần viết lại.
        if (!street || !city) {
            throw new Error("Đường và Thành phố không được để trống.");
        }
        if (!zipCode || zipCode.length < 5) {
            throw new Error("Mã bưu điện (ZipCode) không hợp lệ.");
        }
    }

    // 3. SO SÁNH CẤU TRÚC (STRUCTURAL EQUALITY)
    // Tự nó biết cách so sánh với một VO khác cùng loại.
    public equals(otherAddress: Address): boolean {
        if (!otherAddress) return false;
        return this.street === otherAddress.street
            && this.city === otherAddress.city
            && this.zipCode === otherAddress.zipCode;
    }
}


// ============================================================================
// ĐÁP ÁN 2: REFACTOR CLASS USER
// ============================================================================
class RichUser {
    public readonly id: string;
    public name: string;
    
    // Gộp 3 biến nguyên thủy (string) thành 1 Đối tượng Giá trị (VO) duy nhất.
    private address: Address;

    constructor(id: string, name: string, initialAddress: Address) {
        this.id = id;
        this.name = name;
        this.address = initialAddress;
    }

    // Mọi thao tác thay đổi địa chỉ bắt buộc phải TẠO MỚI một Value Object
    // Tuyệt đối không được sửa thuộc tính của VO hiện tại.
    public relocate(newAddress: Address) {
        console.log(`[User] Đang chuyển nhà cho ${this.name}...`);
        this.address = newAddress; 
    }

    public getAddress(): Address {
        return this.address;
    }
}


// ============================================================================
// TEST CHẠY THỬ
// ============================================================================
function runTest() {
    console.log("=== KIỂM TRA VALUE OBJECT ===");
    
    const homeAddress = new Address("123 Main St", "NY", "10001");
    const alice = new RichUser("U1", "Alice", homeAddress);
    
    const bobAddress = new Address("123 Main St", "NY", "10001");

    // 1. Dùng hàm equals() tích hợp sẵn của VO để kiểm tra chung nhà
    console.log("Alice và Bob ở chung nhà? ->", alice.getAddress().equals(bobAddress)); // true

    // 2. Chặn lỗi từ trứng nước (Bảo vệ tính toàn vẹn)
    try {
        const badAddress = new Address("Fake St", "City", "12"); // Lỗi vì zipcode ngắn
    } catch (e: any) {
        console.log("Validation bắt lỗi thành công:", e.message);
    }

    // 3. Immutability (Bất biến)
    // alice.getAddress().city = "New City"; // BÁO LỖI BIÊN DỊCH BỞI TYPESCRIPT NGAY LẬP TỨC (Read-only)
    
    // Cách đúng để đổi địa chỉ: Tạo VO mới và thay thế
    const newHome = new Address("456 Park Ave", "NY", "10002");
    alice.relocate(newHome);
    console.log("Địa chỉ mới của Alice:", alice.getAddress());
}

runTest();
