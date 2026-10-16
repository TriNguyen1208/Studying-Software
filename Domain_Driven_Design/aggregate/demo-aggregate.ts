/**
 * File: demo-aggregate.ts
 * Minh họa Anti-pattern: Chọc thủng ranh giới của Aggregate (Vượt mặt Root).
 */

// ============================================================================
// ĐỐI TƯỢNG CON (CHILD ENTITY)
// ============================================================================
export class OrderItem {
    constructor(
        public productId: string,
        public price: number,
        public quantity: number // Anti-pattern: Đang để public cho thiên hạ sửa
    ) {}

    public getSubtotal(): number {
        return this.price * this.quantity;
    }
}

// ============================================================================
// AGGREGATE ROOT (TRƯỞNG NHÓM)
// ============================================================================
export class Order {
    public id: string;
    // Anti-pattern: Lộ mảng các phần tử con ra ngoài cho thiên hạ sửa trực tiếp
    public items: OrderItem[] = []; 
    public totalPrice: number = 0;

    constructor(id: string) {
        this.id = id;
    }

    public addItem(item: OrderItem) {
        this.items.push(item);
        this.totalPrice += item.getSubtotal(); // Cập nhật tính toàn vẹn (Invariant)
    }
}

// ============================================================================
// SERVICE BÊN NGOÀI (KẺ TỘI ĐỒ PHÁ VỠ AGGREGATE)
// ============================================================================
class OrderService {
    public changeItemQuantity(order: Order, productId: string, newQuantity: number) {
        console.log(`\n[Anti-Pattern] Bắt đầu sửa số lượng món hàng...`);
        
        // 1. Chọc trực tiếp vào mảng con (Vượt mặt Root)
        const item = order.items.find(i => i.productId === productId);
        
        if (item) {
            // 2. Sửa trực tiếp dữ liệu con (Phá vỡ ranh giới)
            item.quantity = newQuantity;
            console.log(`Đã sửa số lượng món ${productId} thành ${newQuantity}`);
            
            // HẬU QUẢ NGHIÊM TRỌNG: 
            // order.totalPrice KHÔNG HỀ ĐƯỢC CẬP NHẬT.
            // Dữ liệu toàn vẹn của Đơn hàng (Invariant) đã bị hủy hoại!
        }
    }
}

// ============================================================================
// CHẠY THỬ ĐỂ THẤY LỖI
// ============================================================================
function testFail() {
    const order = new Order("ORD_001");
    order.addItem(new OrderItem("LAPTOP", 1000, 1));
    
    console.log(`Trước khi sửa: Tổng tiền = ${order.totalPrice}`); // 1000

    const service = new OrderService();
    // Khách gọi đổi mua 5 cái Laptop
    service.changeItemQuantity(order, "LAPTOP", 5); 

    // Kiểm tra lại tổng tiền
    console.log(`Sau khi sửa: Tổng tiền = ${order.totalPrice}`); 
    // -> Bị LỖI! Đáng lẽ phải là 5000, nhưng nó vẫn in ra 1000 do Service chọc sai cách!
}

testFail();
