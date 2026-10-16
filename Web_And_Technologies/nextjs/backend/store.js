/**
 * store.js - Quản lý Dữ liệu Bộ nhớ (In-Memory Database & Event Bus)
 * 
 * Tại sao dùng module này?
 * - Cung cấp khả năng lưu trữ và đồng bộ trạng thái giữa Next.js Frontend và Node.js Backend.
 * - Hỗ trợ Event Bus cho SSE (Server-Sent Events) để bắn tín hiệu thời gian thực khi có đơn hàng mới
 *   hoặc khi tồn kho (inventory) thay đổi, giúp trang Next.js cập nhật trực tiếp.
 */

const { initialProducts } = require('./seed');

class DataStore {
  constructor() {
    // Khởi tạo danh sách sản phẩm với bản sao sâu để tránh tham chiếu rác
    this.products = JSON.parse(JSON.stringify(initialProducts));
    this.orders = [];
    this.sseClients = []; // Danh sách các kết nối SSE đang mở từ browser / Next.js Client
  }

  // Lấy toàn bộ sản phẩm
  getAllProducts() {
    return this.products;
  }

  // Lấy chi tiết 1 sản phẩm theo ID
  getProductById(id) {
    return this.products.find(p => p.id === id || p.slug === id);
  }

  // Cập nhật tồn kho (Stock decrement / increment)
  updateStock(productId, quantityToReduce) {
    const product = this.getProductById(productId);
    if (!product) {
      throw new Error(`Sản phẩm với ID ${productId} không tồn tại`);
    }

    if (product.stock < quantityToReduce) {
      throw new Error(`Tồn kho không đủ! Chỉ còn ${product.stock} sản phẩm.`);
    }

    product.stock -= quantityToReduce;

    // Bắn sự kiện cập nhật tồn kho tới tất cả client đang theo dõi SSE
    this.broadcastSSE('INVENTORY_UPDATED', {
      productId: product.id,
      newStock: product.stock,
      timestamp: new Date().toISOString()
    });

    return product;
  }

  // Tạo đơn hàng mới
  createOrder({ customerName, email, items, totalAmount }) {
    // 1. Kiểm tra tồn kho trước khi đặt (Atomic Check)
    for (const item of items) {
      const prod = this.getProductById(item.productId);
      if (!prod || prod.stock < item.quantity) {
        throw new Error(`Sản phẩm ${prod ? prod.name : item.productId} không đủ số lượng tồn kho.`);
      }
    }

    // 2. Trừ tồn kho
    for (const item of items) {
      this.updateStock(item.productId, item.quantity);
    }

    // 3. Tạo record đơn hàng
    const newOrder = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerName,
      email,
      items,
      totalAmount,
      status: "COMPLETED",
      createdAt: new Date().toISOString()
    };

    this.orders.unshift(newOrder);

    // 4. Bắn thông báo SSE tới Admin Dashboard trên Next.js
    this.broadcastSSE('ORDER_CREATED', {
      order: newOrder,
      message: `Đơn hàng mới #${newOrder.id} vừa được tạo bởi ${customerName}!`
    });

    return newOrder;
  }

  // Lấy danh sách đơn hàng
  getAllOrders() {
    return this.orders;
  }

  // Đăng ký client nhận Server-Sent Events (SSE)
  addSSEClient(res) {
    this.sseClients.push(res);
  }

  // Hủy đăng ký khi client ngắt kết nối
  removeSSEClient(res) {
    this.sseClients = this.sseClients.filter(client => client !== res);
  }

  // Phát sóng sự kiện tới toàn bộ SSE clients
  broadcastSSE(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.sseClients.forEach(res => {
      try {
        res.write(payload);
      } catch (err) {
        console.error("Lỗi khi gửi SSE payload:", err.message);
      }
    });
  }
}

// Singleton Pattern: Đảm bảo duy nhất 1 instance store trên toàn bộ Node.js process
const store = new DataStore();
module.exports = store;
