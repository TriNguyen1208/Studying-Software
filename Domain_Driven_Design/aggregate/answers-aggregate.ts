/**
 * File: answers-aggregate.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH AGGREGATE
 * 
 * Yêu cầu: Khóa quyền truy cập trực tiếp vào Child (OrderItem),
 * ủy quyền toàn bộ việc sửa đổi cho Aggregate Root (Order) xử lý.
 */

// ============================================================================
// ĐỐI TƯỢNG CON (CHILD ENTITY)
// ============================================================================
class OrderItem {
    // Thuộc tính private/readonly, không ai ở ngoài được quyền sửa
    constructor(
        public readonly productId: string,
        public readonly price: number,
        private _quantity: number 
    ) {}

    // Cách duy nhất để sửa là qua hàm có kiểm soát
    public updateQuantity(newQuantity: number) {
        if (newQuantity < 0) throw new Error("Số lượng không hợp lệ");
        this._quantity = newQuantity;
    }

    public getQuantity(): number {
        return this._quantity;
    }

    public getSubtotal(): number {
        return this.price * this._quantity;
    }
}

// ============================================================================
// AGGREGATE ROOT (TRƯỞNG NHÓM) - CHỈ HUY MỌI THỨ
// ============================================================================
class Order {
    public readonly id: string;
    private _items: OrderItem[] = []; // Khóa kín mảng con!
    private _totalPrice: number = 0;

    constructor(id: string) {
        this.id = id;
    }

    // Hàm nội bộ tự tính lại tiền (Đảm bảo Invariant luôn đúng)
    private recalculateTotalPrice() {
        this._totalPrice = this._items.reduce((sum, item) => sum + item.getSubtotal(), 0);
    }

    public addItem(item: OrderItem) {
        this._items.push(item);
        this.recalculateTotalPrice();
    }

    // ĐÁP ÁN CHÍNH: Cung cấp API (Hàm) từ Root để bên ngoài gọi vào
    // External Service không cần và KHÔNG ĐƯỢC quan tâm đến _items ở bên trong.
    public updateItemQuantity(productId: string, newQuantity: number) {
        console.log(`\n[Rich Aggregate] Trưởng nhóm (Root) đang nhận lệnh sửa số lượng...`);
        const item = this._items.find(i => i.productId === productId);
        
        if (!item) {
            throw new Error(`Không tìm thấy sản phẩm ${productId} trong Đơn hàng.`);
        }

        // Gọi hàm của con
        item.updateQuantity(newQuantity);
        
        // TRƯỞNG NHÓM TỰ ĐỘNG CẬP NHẬT TỔNG TIỀN
        // Đảm bảo không bao giờ có chuyện tổng tiền bị sai lệch!
        this.recalculateTotalPrice();
        console.log(`[Rich Aggregate] Sửa thành công. Đã tự động cập nhật tổng tiền.`);
    }

    public getTotalPrice(): number {
        return this._totalPrice;
    }
}

// ============================================================================
// CHẠY THỬ (TEST)
// ============================================================================
function testSuccess() {
    const order = new Order("ORD_001");
    order.addItem(new OrderItem("LAPTOP", 1000, 1));
    
    console.log(`Trước khi sửa: Tổng tiền = ${order.getTotalPrice()}`); // 1000

    // Người ngoài chỉ giao tiếp qua Aggregate Root
    order.updateItemQuantity("LAPTOP", 5);

    // Kiểm tra lại tổng tiền
    console.log(`Sau khi sửa: Tổng tiền = ${order.getTotalPrice()}`); 
    // -> ĐÚNG CHUẨN! Tổng tiền đã được tự động tính lại thành 5000.
}

testSuccess();
