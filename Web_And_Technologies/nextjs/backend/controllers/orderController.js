/**
 * orderController.js - Điều khiển nghiệp vụ đơn hàng & Sự kiện thời gian thực (SSE)
 * 
 * Phục vụ các endpoint:
 * - POST /api/orders: Tạo đơn hàng mới (gọi từ Next.js Server Actions)
 * - GET /api/orders: Xem lịch sử đơn hàng (Admin Dashboard)
 * - GET /api/events: Server-Sent Events (SSE) để truyền dữ liệu thời gian thực tới Next.js Client
 */

const store = require('../store');

const orderController = {
  // 1. Tạo đơn hàng mới
  createOrder: (req, res) => {
    try {
      const { customerName, email, items, totalAmount } = req.body;

      // Validation đầu vào nghiêm ngặt
      if (!customerName || !email || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Thông tin đơn hàng không hợp lệ. Vui lòng cung cấp đầy đủ họ tên, email và danh sách sản phẩm."
        });
      }

      const order = store.createOrder({ customerName, email, items, totalAmount });

      return res.status(201).json({
        success: true,
        message: "Đặt hàng thành công!",
        order
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // 2. Lấy danh sách toàn bộ đơn hàng
  getAllOrders: (req, res) => {
    const orders = store.getAllOrders();
    res.json({
      success: true,
      count: orders.length,
      orders
    });
  },

  // 3. Server-Sent Events (SSE) Stream
  // Kênh kết nối HTTP giữ mở một chiều để backend đẩy dữ liệu mới về Next.js Admin Dashboard
  streamEvents: (req, res) => {
    // Cấu hình HTTP Headers đặc biệt dành cho SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders(); // Đẩy headers xuống client ngay lập tức

    // Gửi tin nhắn chào mừng ban đầu
    res.write(`event: CONNECTED\ndata: ${JSON.stringify({ message: "Đã kết nối luồng SSE từ Node.js Backend", timestamp: new Date().toISOString() })}\n\n`);

    // Đăng ký client vào danh sách phát sóng
    store.addSSEClient(res);

    // Gửi tín hiệu giữ nhịp thở (heartbeat / ping) mỗi 15 giây chống timeout kết nối
    const heartbeat = setInterval(() => {
      res.write(`event: PING\ndata: ${Date.now()}\n\n`);
    }, 15000);

    // Khi client ngắt kết nối (đóng tab trình duyệt hoặc reload trang)
    req.on('close', () => {
      clearInterval(heartbeat);
      store.removeSSEClient(res);
      res.end();
    });
  }
};

module.exports = orderController;
