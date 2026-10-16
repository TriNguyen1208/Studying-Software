const EventEmitter = require('events');

// ==========================================
// 1. EVENT BUS: Xương sống của giao tiếp
// ==========================================
// Khởi tạo một Event Bus dùng chung. Trong Modular Monolith, các module 
// không nằm ở các máy chủ khác nhau nên ta dùng EventEmitter có sẵn của Node.js.
// Chúng giao tiếp qua chung bộ nhớ (in-memory), cực kì nhanh, không có độ trễ mạng.
const eventBus = new EventEmitter();


// ==========================================
// 2. USER MODULE
// ==========================================
// Đây là một "căn phòng" đóng kín.
class UserModule {
  constructor() {
    // Giả lập Database của riêng UserModule. 
    // Các module khác KHÔNG ĐƯỢC PHÉP truy cập trực tiếp vào biến này.
    this.usersDb = [
      { id: 1, name: 'Tri', email: 'tri@example.com' },
      { id: 2, name: 'John', email: 'john@example.com' }
    ];
  }

  // Đây là "API Công Khai" (Public Interface) duy nhất của UserModule.
  // Các module khác muốn lấy thông tin user BẮT BUỘC phải gọi qua hàm này.
  getUserById(userId) {
    console.log(`[UserModule] Có người đang truy vấn thông tin user ${userId}`);
    const user = this.usersDb.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User không tồn tại!');
    }
    // Trả về DTO (bản sao của data), không trả về tham chiếu thật để tránh bị sửa bậy.
    return { ...user }; 
  }
}


// ==========================================
// 3. INVENTORY MODULE (Kho Hàng)
// ==========================================
// Một "căn phòng" khác. Thằng này không cung cấp hàm để gọi trực tiếp,
// mà nó sẽ lắng nghe sự kiện từ Event Bus.
class InventoryModule {
  constructor(eventBus) {
    this.stockDb = {
      product_A: 100,
      product_B: 50
    };

    // Khi khởi tạo, InventoryModule "dán tai vào tường" lắng nghe sự kiện ORDER_CREATED
    eventBus.on('ORDER_CREATED', (eventData) => {
      this.handleOrderCreated(eventData);
    });
  }

  // Hàm nội bộ (Private). Chỉ có InventoryModule tự gọi nó.
  handleOrderCreated({ orderId, productId, qty }) {
    console.log(`[InventoryModule] Nghe thấy có đơn hàng ${orderId} vừa tạo.`);
    
    if (this.stockDb[productId] >= qty) {
      this.stockDb[productId] -= qty;
      console.log(`[InventoryModule] Đã trừ ${qty} sản phẩm ${productId} trong kho. Tồn kho còn: ${this.stockDb[productId]}`);
    } else {
      console.log(`[InventoryModule] CẢNH BÁO: Hết hàng cho sản phẩm ${productId}!`);
      // Thực tế ở đây nó sẽ phát ra sự kiện INVENTORY_FAILED để OrderModule biết mà rollback
    }
  }
}


// ==========================================
// 4. ORDER MODULE (Đơn Hàng)
// ==========================================
// Đây là module "Nhạc trưởng" trong kịch bản này.
class OrderModule {
  // OrderModule cần biết về userModule (để lấy thông tin user) và eventBus (để phát sự kiện)
  constructor(userModule, eventBus) {
    this.userModule = userModule;
    this.eventBus = eventBus;
    this.ordersDb = []; // DB riêng của đơn hàng
  }

  // Hàm tạo đơn hàng
  createOrder(userId, productId, qty) {
    console.log(`\n--- BẮT ĐẦU TẠO ĐƠN HÀNG ---`);
    
    // BƯỚC 1: Gọi chéo sang UserModule qua Interface công khai để kiểm tra User.
    // Chú ý: Không được truy cập thẳng vào userModule.usersDb!
    const user = this.userModule.getUserById(userId);
    console.log(`[OrderModule] Lấy thành công user: ${user.name}`);

    // BƯỚC 2: Lưu vào DB của chính OrderModule
    const newOrder = {
      orderId: `ORD-${Date.now()}`,
      userId: user.id,
      productId: productId,
      qty: qty,
      status: 'CREATED'
    };
    this.ordersDb.push(newOrder);
    console.log(`[OrderModule] Đã tạo đơn hàng ${newOrder.orderId} thành công.`);

    // BƯỚC 3: Giao tiếp hướng sự kiện (Event-Driven)
    // OrderModule KHÔNG GỌI inventoryModule.reduceStock(). Nó không cần biết InventoryModule có tồn tại hay không.
    // Nó chỉ "hét lên" (emit) vào Event Bus.
    console.log(`[OrderModule] Emit sự kiện ORDER_CREATED vào Event Bus...`);
    this.eventBus.emit('ORDER_CREATED', {
      orderId: newOrder.orderId,
      productId: newOrder.productId,
      qty: newOrder.qty
    });
  }
}


// ==========================================
// 5. BOOTSTRAP (Hệ thống khởi chạy - Khâu ghép nối)
// ==========================================
// Nơi lắp ráp các căn phòng lại với nhau thành 1 tòa nhà
const userMod = new UserModule();
// Inventory nghe eventBus
const inventoryMod = new InventoryModule(eventBus); 
// Order phụ thuộc userMod và eventBus
const orderMod = new OrderModule(userMod, eventBus); 

// Kịch bản thực thi: Trí mua 2 cái điện thoại product_A
try {
  // Chỉ việc gọi hàm của OrderModule, các hệ thống khác sẽ tự động phản ứng
  orderMod.createOrder(1, 'product_A', 2);
} catch (error) {
  console.error(`LỖI: ${error.message}`);
}
