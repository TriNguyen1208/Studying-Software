// ============================================================================
// DEMO: Kiến trúc Hướng Dịch vụ (Service-Oriented Architecture - SOA)
// ============================================================================
// Trong SOA, các hệ thống lớn được chia thành các dịch vụ (services) riêng biệt.
// Mỗi dịch vụ cung cấp một chức năng nghiệp vụ cụ thể và giao tiếp qua mạng.
// Đoạn code này mô phỏng hai dịch vụ: Order Service (Dịch vụ Đơn hàng) và 
// Inventory Service (Dịch vụ Kho), giao tiếp qua HTTP.

const express = require('express'); // Import thư viện Express để tạo web server
const axios = require('axios');     // Import Axios để thực hiện HTTP requests giữa các dịch vụ

// ----------------------------------------------------------------------------
// 1. INVENTORY SERVICE (Dịch vụ Kho hàng)
// Dịch vụ này quản lý số lượng hàng tồn kho. Nó là một dịch vụ độc lập.
// ----------------------------------------------------------------------------
const inventoryApp = express(); // Tạo một Express app cho Inventory Service
inventoryApp.use(express.json()); // Cấu hình để app có thể đọc được JSON body trong request

// Dữ liệu giả lập cho kho hàng (trong thực tế sẽ lưu ở Database riêng)
const inventoryDb = {
    'item-001': { name: 'Laptop', quantity: 10 },
    'item-002': { name: 'Mouse', quantity: 50 }
};

// API Endpoint để kiểm tra số lượng tồn kho của một sản phẩm
inventoryApp.get('/api/inventory/:itemId', (req, res) => {
    // Lấy itemId từ URL parameter
    const itemId = req.params.itemId; 
    // Tìm sản phẩm trong cơ sở dữ liệu giả
    const item = inventoryDb[itemId]; 
    
    if (item) {
        // Nếu tìm thấy, trả về thông tin sản phẩm với HTTP status 200 (OK)
        res.status(200).json({ success: true, data: item });
    } else {
        // Nếu không tìm thấy, trả về lỗi HTTP status 404 (Not Found)
        res.status(404).json({ success: false, message: 'Item not found' });
    }
});

// API Endpoint để trừ số lượng tồn kho (khi có đơn hàng mới)
inventoryApp.post('/api/inventory/:itemId/deduct', (req, res) => {
    // Lấy itemId từ URL
    const itemId = req.params.itemId;
    // Lấy số lượng cần trừ từ request body
    const deductAmount = req.body.amount; 
    
    const item = inventoryDb[itemId];
    
    if (!item) {
        // Không tìm thấy sản phẩm
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    if (item.quantity >= deductAmount) {
        // Nếu đủ số lượng, thực hiện trừ đi
        item.quantity -= deductAmount;
        // Trả về thành công
        res.status(200).json({ success: true, message: 'Inventory deducted successfully', remaining: item.quantity });
    } else {
        // Nếu không đủ số lượng, trả về lỗi HTTP status 400 (Bad Request)
        res.status(400).json({ success: false, message: 'Insufficient inventory' });
    }
});

// Khởi động Inventory Service trên cổng 3001
inventoryApp.listen(3001, () => {
    console.log('📦 Inventory Service is running on http://localhost:3001');
});


// ----------------------------------------------------------------------------
// 2. ORDER SERVICE (Dịch vụ Đơn hàng)
// Dịch vụ này xử lý việc đặt hàng. Nó cần gọi sang Inventory Service để kiểm tra 
// và trừ tồn kho. Đây là sự giao tiếp giữa các dịch vụ trong SOA.
// ----------------------------------------------------------------------------
const orderApp = express(); // Tạo một Express app cho Order Service
orderApp.use(express.json()); // Cấu hình đọc JSON body

// API Endpoint để tạo một đơn hàng mới
orderApp.post('/api/orders', async (req, res) => {
    // Lấy thông tin đơn hàng từ client gửi lên
    const { itemId, amount, customerId } = req.body; 

    try {
        console.log(`[Order Service] Bắt đầu xử lý đơn hàng cho khách ${customerId}...`);

        // BƯỚC 1: Gọi sang Inventory Service để kiểm tra tồn kho.
        // Đây là lời gọi qua mạng (Network call), đặc trưng của SOA/Microservices.
        console.log(`[Order Service] Đang gọi Inventory Service để kiểm tra...`);
        const inventoryCheck = await axios.get(`http://localhost:3001/api/inventory/${itemId}`);
        
        // Nếu số lượng tồn kho hiện tại nhỏ hơn số lượng khách muốn mua
        if (inventoryCheck.data.data.quantity < amount) {
            return res.status(400).json({ success: false, message: 'Không đủ hàng trong kho để đặt!' });
        }

        // BƯỚC 2: Gọi sang Inventory Service để trừ số lượng.
        console.log(`[Order Service] Đang gọi Inventory Service để trừ tồn kho...`);
        await axios.post(`http://localhost:3001/api/inventory/${itemId}/deduct`, {
            amount: amount
        });

        // BƯỚC 3: Tạo đơn hàng thành công (lưu vào database của Order Service - giả lập)
        const orderId = `ORD-${Math.floor(Math.random() * 10000)}`;
        console.log(`[Order Service] Tạo đơn hàng thành công: ${orderId}`);
        
        // Trả kết quả về cho client
        res.status(201).json({ 
            success: true, 
            message: 'Đặt hàng thành công!', 
            orderId: orderId 
        });

    } catch (error) {
        // Xử lý lỗi nếu việc giao tiếp giữa các dịch vụ thất bại (ví dụ: Inventory Service bị sập)
        console.error(`[Order Service] Lỗi: ${error.message}`);
        
        // Phân biệt lỗi do Inventory trả về (như 404, 400) hay lỗi không kết nối được mạng
        if (error.response) {
            // Lỗi từ phía Inventory Service trả về
            res.status(error.response.status).json(error.response.data);
        } else {
            // Lỗi hệ thống/mạng
            res.status(500).json({ success: false, message: 'Lỗi hệ thống nội bộ khi kết nối dịch vụ.' });
        }
    }
});

// Khởi động Order Service trên cổng 3002
orderApp.listen(3002, () => {
    console.log('🛒 Order Service is running on http://localhost:3002');
});

// ============================================================================
// CÁCH CHẠY DEMO:
// 1. Cài đặt các thư viện: npm install express axios
// 2. Chạy file này: node demo-soa.js
// 3. Mở terminal mới và test bằng curl:
//    curl -X POST http://localhost:3002/api/orders -H "Content-Type: application/json" -d '{"itemId": "item-001", "amount": 2, "customerId": "CUST-99"}'
// ============================================================================
