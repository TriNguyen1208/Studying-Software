/**
 * ĐÁP ÁN: SỬA LỖI N+1 QUERY TRONG API COMPOSITION
 * Gọi 1 lần duy nhất để lấy thông tin của TẤT CẢ User
 */

const express = require('express');
const axios = require('axios');

const gateway = express();
const orders = [
    { orderId: 101, userId: 1, total: 500 },
    { orderId: 102, userId: 2, total: 100 },
    { orderId: 103, userId: 1, total: 300 }, // User 1 lặp lại
];

gateway.get('/orders-optimized', async (req, res) => {
    console.log('[Gateway] Yêu cầu lấy danh sách đơn hàng (ĐÃ TỐI ƯU)...');
    const startTime = Date.now();
    const resultOrders = JSON.parse(JSON.stringify(orders));

    try {
        // BƯỚC 1: Thu thập tất cả các ID độc nhất (Unique IDs) từ danh sách đơn hàng
        // Dùng Set để loại bỏ ID trùng lặp (ví dụ: userId 1 xuất hiện 2 lần thì chỉ gọi 1 lần)
        const uniqueUserIds = [...new Set(resultOrders.map(order => order.userId))];
        console.log(`- Chỉ cần gọi 1 API lấy danh sách User IDs: ${uniqueUserIds.join(',')}`);

        // BƯỚC 2: Gọi 1 API duy nhất (Batch Request) sang User Service
        const userRes = await axios.get(`http://localhost:4001/users?ids=${uniqueUserIds.join(',')}`);
        const fetchedUsers = userRes.data; // Mảng các users
        
        // BƯỚC 3: Tạo một Hash Map (Dictionary) để tra cứu siêu tốc dưới RAM
        // { '1': { name: 'Tri', level: 'VIP' }, '2': { ... } }
        const userMap = {};
        fetchedUsers.forEach(u => {
            userMap[u.id] = u;
        });

        // BƯỚC 4: Loop qua mảng Order gốc và nhét dữ liệu vào từ Hash Map
        resultOrders.forEach(order => {
            const matchedUser = userMap[order.userId];
            if (matchedUser) {
                order.userName = matchedUser.name;
                order.userLevel = matchedUser.level;
            } else {
                order.userName = 'Unknown';
            }
        });

    } catch (e) {
        console.error("Lỗi khi gọi API User Service", e.message);
    }

    const endTime = Date.now();
    console.log(`[Gateway TỐI ƯU] Hoàn thành cực nhanh trong ${endTime - startTime}ms`);
    
    res.json({
        timeTakenMs: endTime - startTime,
        data: resultOrders
    });
});

gateway.listen(4002, () => {
    console.log('Gateway (Tối ưu) chạy ở Port 4002');
    
    // Bạn cần CHẠY SONG SONG file `demo-api-composition.js` để bật cổng 4001 của User Service lên trước
    setTimeout(async () => {
        console.log('\n--- BẮT ĐẦU TEST (Đã tối ưu) ---');
        try {
            const res = await axios.get('http://localhost:4002/orders-optimized');
            console.log('Dữ liệu trả về:\n', res.data.data);
            console.log('Tổng thời gian tốn:', res.data.timeTakenMs, 'ms (Chỉ tốn đúng 1 nhịp gọi mạng thay vì 3 nhịp)');
        } catch (e) {
            console.log("Cần chạy file demo-api-composition.js trước để bật port 4001 nhé!");
        }
    }, 1500);
});
