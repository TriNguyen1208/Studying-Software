/**
 * DEMO: Kiến trúc Microservices Cơ Bản
 * 
 * Mô hình này gồm 3 ứng dụng riêng biệt (chạy trên 3 Port khác nhau):
 * 1. API Gateway (Port 3000): Điểm nhận request duy nhất từ người dùng.
 * 2. User Service (Port 3001): Quản lý thông tin User (Database riêng).
 * 3. Order Service (Port 3002): Quản lý Đơn Hàng. Giao tiếp với User Service qua API.
 * 
 * YÊU CẦU: Để chạy file này, bạn cần cài đặt: `npm install express axios`
 */

const express = require('express');
const axios = require('axios');

// ============================================================================
// 1. USER SERVICE (Port 3001) - Chạy độc lập
// ============================================================================
const userService = express();
const userDB = [
    { id: 1, name: 'Tri', balance: 500 },
    { id: 2, name: 'John', balance: 100 }
];

userService.get('/users/:id', (req, res) => {
    // Tìm user trong database cục bộ của service này
    const user = userDB.find(u => u.id === parseInt(req.params.id));
    if (user) {
        res.json({ success: true, data: user });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

userService.listen(3001, () => {
    console.log('[User Service] đang chạy tại cổng 3001');
});


// ============================================================================
// 2. ORDER SERVICE (Port 3002) - Chạy độc lập
// ============================================================================
const orderService = express();
const orderDB = [];

orderService.post('/orders', express.json(), async (req, res) => {
    const { userId, product, price } = req.body;

    try {
        // [QUAN TRỌNG]: Trong Microservices, Order Service KHÔNG có database của User.
        // Nó phải gọi API qua mạng (HTTP Call) tới User Service để hỏi thông tin User.
        console.log(`[Order Service] Đang gọi sang User Service để kiểm tra user ${userId}...`);
        
        // Gọi HTTP Đồng bộ (Synchronous Call)
        const userResponse = await axios.get(`http://localhost:3001/users/${userId}`);
        const user = userResponse.data.data;

        // Nếu user tồn tại và đủ tiền (logic đơn giản)
        if (user.balance >= price) {
            const newOrder = { id: orderDB.length + 1, userId, product, status: 'SUCCESS' };
            orderDB.push(newOrder);
            res.json({ success: true, message: 'Đặt hàng thành công', order: newOrder });
        } else {
            res.status(400).json({ success: false, message: 'Không đủ số dư' });
        }
    } catch (error) {
        // Đây là điểm Yếu của việc gọi Đồng bộ trong Microservices!
        // Nếu User Service sập, request đặt hàng này sẽ thất bại hoàn toàn.
        console.error(`[Order Service LỖI] Không thể kết nối tới User Service!`);
        res.status(500).json({ success: false, message: 'Hệ thống đang bảo trì, vui lòng thử lại sau.' });
    }
});

orderService.listen(3002, () => {
    console.log('[Order Service] đang chạy tại cổng 3002');
});


// ============================================================================
// 3. API GATEWAY (Port 3000) - Cửa ngõ duy nhất
// ============================================================================
const gateway = express();

// Định tuyến (Routing): Người dùng chỉ biết tới Port 3000.
// Gateway sẽ làm nhiệm vụ chuyển tiếp (proxy) tới đúng Service ẩn bên trong.
gateway.use('/api/users', async (req, res) => {
    try {
        // Chuyển tiếp tới User Service
        const response = await axios({
            method: req.method,
            url: `http://localhost:3001${req.url}`,
            data: req.body
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'Gateway Error' });
    }
});

gateway.use('/api/orders', express.json(), async (req, res) => {
    try {
        // Chuyển tiếp tới Order Service
        const response = await axios({
            method: req.method,
            url: `http://localhost:3002${req.url}`,
            data: req.body
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'Gateway Error' });
    }
});

gateway.listen(3000, () => {
    console.log('[API Gateway] đang chạy tại cổng 3000. Cửa ngõ duy nhất mở ra Internet!');
    
    // ========================================================================
    // TEST SCRIPT (Giả lập người dùng gọi từ App Điện Thoại)
    // ========================================================================
    setTimeout(async () => {
        console.log('\n--- BẮT ĐẦU TEST TỪ APP ---');
        console.log('App: Gọi đặt hàng vào API Gateway (Port 3000)...');
        
        try {
            const res = await axios.post('http://localhost:3000/api/orders', {
                userId: 1,
                product: 'MacBook Pro',
                price: 100
            });
            console.log('App nhận kết quả:', res.data);
        } catch (e) {
            console.log('App lỗi:', e.response.data);
        }
    }, 2000);
});
