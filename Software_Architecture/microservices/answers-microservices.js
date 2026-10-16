/**
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH MICROSERVICES
 * ---------------------------------------------------------
 * Giải quyết Thử thách 2: Xử lý Fallback khi User Service bị sập.
 * Nếu không có Fallback, khi User Service sập, toàn bộ tiến trình đặt hàng sẽ bị crash.
 */

const express = require('express');
const axios = require('axios');

const orderService = express();
const orderDB = [];

// API Đặt hàng có trang bị Fallback (Cơ chế chống đứt gãy)
orderService.post('/orders', express.json(), async (req, res) => {
    const { userId, product, price } = req.body;
    let user = null;

    try {
        console.log(`[Order Service] Đang gọi sang User Service để kiểm tra user ${userId}...`);
        
        // Cài đặt timeout cực ngắn (ví dụ 1000ms) để không làm treo hệ thống nếu User Service bị lag
        const userResponse = await axios.get(`http://localhost:3001/users/${userId}`, { timeout: 1000 });
        user = userResponse.data.data;
        console.log('[Order Service] Đã lấy được thông tin User từ User Service.');

    } catch (error) {
        console.error(`[Order Service LỖI] Mất kết nối tới User Service! (${error.message})`);
        
        // ====================================================================
        // ĐÁP ÁN: CƠ CHẾ FALLBACK
        // ====================================================================
        // Tùy theo nghiệp vụ, chúng ta có thể:
        // Cách 1: Trả về lỗi thân thiện ngay lập tức thay vì crash server
        // return res.status(503).json({ success: false, message: 'Hệ thống đánh giá người dùng đang bận, vui lòng thử lại sau.' });

        // Cách 2: Dùng dữ liệu Default (Khách Vãng Lai) để không làm mất luồng mua hàng của khách.
        console.log('[Order Service FALLBACK] Tự động chuyển sang chế độ Khách Vãng Lai (Guest) để giữ đơn hàng.');
        user = { id: userId, name: 'Guest', balance: 999999 }; // Cấp quyền vô hạn để qua được bước check
    }

    // Tiếp tục luồng xử lý chính
    if (user.balance >= price) {
        const newOrder = { id: orderDB.length + 1, userId: user.id, product, status: 'SUCCESS_FALLBACK_APPLIED' };
        orderDB.push(newOrder);
        res.json({ success: true, message: 'Đặt hàng thành công', order: newOrder });
    } else {
        res.status(400).json({ success: false, message: 'Không đủ số dư' });
    }
});

orderService.listen(3002, () => {
    console.log('[Order Service] đang chạy tại cổng 3002 (Có trang bị Fallback)');
});

// THỬ NGHIỆM:
// Bạn không cần bật User Service (không chạy server cổng 3001).
// Chỉ cần chạy file này và test gọi API. Order Service vẫn sẽ hoạt động nhờ Fallback!
setTimeout(async () => {
    console.log('\n--- BẮT ĐẦU TEST FALLBACK ---');
    try {
        const res = await axios.post('http://localhost:3002/orders', {
            userId: 1,
            product: 'MacBook Pro',
            price: 100
        });
        console.log('App nhận kết quả:', res.data);
    } catch (e) {
        console.log('App lỗi:', e.response?.data || e.message);
    }
}, 2000);
