/**
 * File: demo-bounded-context.ts
 * Minh họa ANTI-PATTERN: God Class khi không có Bounded Context.
 */

// ============================================================================
// VẤN ĐỀ: GOD CLASS (SẢN PHẨM KHỔNG LỒ XÀI CHUNG)
// Tất cả các phòng ban đều phải chui vào đây để sửa code.
// ============================================================================
class GodProduct {
    public id: string;
    
    // --- Của đội Bán Hàng (Sales) ---
    public name: string;
    public price: number;
    public discountPercent: number;
    public seoKeywords: string[];
    
    // --- Của đội Kho Bãi & Vận chuyển (Inventory/Shipping) ---
    public stockQuantity: number;
    public warehouseLocation: string; // VD: Khu A, Kệ số 3
    public weightInKg: number;

    // --- Của đội Bảo hành (Warranty) ---
    public warrantyMonths: number;
    public repairHistory: string[];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        // ... khởi tạo một nùi thứ hầm bà lằng
        this.price = 0;
        this.discountPercent = 0;
        this.seoKeywords = [];
        this.stockQuantity = 0;
        this.warehouseLocation = "";
        this.weightInKg = 0;
        this.warrantyMonths = 0;
        this.repairHistory = [];
    }

    // Hành vi cũng bị nhồi nhét vào chung
    public applyDiscount(percent: number) {
        this.discountPercent = percent;
    }

    public shipToCustomer(address: string) {
        if (this.stockQuantity <= 0) throw new Error("Hết hàng!");
        this.stockQuantity--;
        console.log(`Đang ship tới ${address}... Nặng ${this.weightInKg} kg.`);
    }

    public addRepairLog(log: string) {
        this.repairHistory.push(log);
    }
}

// ---------------------------------------------------------
// HẬU QUẢ:
// 1. Khi đội Bán hàng sửa hàm applyDiscount(), họ vô tình gây bug 
//    làm hỏng hàm shipToCustomer() của đội Vận chuyển.
// 2. Class quá to, load vào RAM tốn tài nguyên.
// 3. Khó chia ra làm Microservices vì Database bị chung 1 bảng Product to đùng.
// ---------------------------------------------------------
