/**
 * DEMO: Cách JOIN Dữ liệu trong Microservices (API Composition)
 * Vấn đề N+1 Query cực đoan.
 */

const express = require('express');
const axios = require('axios');

// 1. User Service giả lập (Chạy port 4001)
const userService = express();
const users = [
    { id: 1, name: 'Tri', level: 'VIP' },
    { id: 2, name: 'John', level: 'Normal' },
    { id: 3, name: 'Alice', level: 'VIP' }
];

userService.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    // Cố tình delay 50ms để thấy sự chậm chạp của mạng
    setTimeout(() => res.json(user), 50); 
});

// API hỗ trợ lấy nhiều user cùng lúc (Batch request) - Dành cho bài tập
userService.get('/users', (req, res) => {
    const ids = req.query.ids ? req.query.ids.split(',').map(Number) : [];
    const matchedUsers = users.filter(u => ids.includes(u.id));
    setTimeout(() => res.json(matchedUsers), 50); 
});

userService.listen(4001, () => console.log('User Service chạy ở Port 4001'));


// 2. Aggregator / API Gateway giả lập (Chạy port 4000)
const gateway = express();
const orders = [
    { orderId: 101, userId: 1, total: 500 },
    { orderId: 102, userId: 2, total: 100 },
    { orderId: 103, userId: 1, total: 300 },
];

gateway.get('/orders', async (req, res) => {
    console.log('[Gateway] Yêu cầu lấy danh sách đơn hàng kèm tên người mua...');
    const startTime = Date.now();
    
    // Bản clone của mảng đơn hàng
    const resultOrders = JSON.parse(JSON.stringify(orders));

    // LỖI HIỆU NĂNG (Anti-pattern): Chạy vòng lặp và gọi API cho TỪNG ĐƠN HÀNG một (N+1 Query)
    for (let i = 0; i < resultOrders.length; i++) {
        const order = resultOrders[i];
        
        try {
            // Đóng vai trò JOIN: Đem userId chạy sang User Service hỏi tên
            console.log(`- Đang gọi API lấy thông tin user id: ${order.userId}...`);
            const userRes = await axios.get(`http://localhost:4001/users/${order.userId}`);
            
            // Gắn thông tin vừa lấy được vào Order (Merge)
            order.userName = userRes.data.name;
            order.userLevel = userRes.data.level;
        } catch (e) {
            order.userName = 'Unknown';
        }
    }

    const endTime = Date.now();
    console.log(`[Gateway] Hoàn thành trong ${endTime - startTime}ms`);
    
    res.json({
        timeTakenMs: endTime - startTime,
        data: resultOrders
    });
});

gateway.listen(4000, () => {
    console.log('Gateway chạy ở Port 4000');
    
    // Chạy test tự động
    setTimeout(async () => {
        console.log('\n--- BẮT ĐẦU TEST (Lỗi N+1 Query) ---');
        const res = await axios.get('http://localhost:4000/orders');
        console.log('Dữ liệu trả về (Đã Join bằng Code):\n', res.data.data);
        console.log('Tổng thời gian tốn:', res.data.timeTakenMs, 'ms (Rất chậm vì gọi nối tiếp)');
    }, 1000);
});
