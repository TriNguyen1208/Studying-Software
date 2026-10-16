// ============================================================================
// ĐÁP ÁN BÀI TẬP: SOA - THÊM PAYMENT SERVICE
// ============================================================================
// Bài tập: Thêm một Payment Service để giả lập việc thanh toán.
// Order Service phải gọi Payment Service sau khi trừ tồn kho thành công.

const express = require('express');
const axios = require('axios');

// ----------------------------------------------------------------------------
// 1. INVENTORY SERVICE
// ----------------------------------------------------------------------------
const inventoryApp = express();
inventoryApp.use(express.json());
const inventoryDb = { 'item-001': { name: 'Laptop', quantity: 10, price: 1000 } };

inventoryApp.get('/api/inventory/:itemId', (req, res) => {
    const item = inventoryDb[req.params.itemId];
    if (item) res.status(200).json({ success: true, data: item });
    else res.status(404).json({ success: false, message: 'Item not found' });
});

inventoryApp.post('/api/inventory/:itemId/deduct', (req, res) => {
    const item = inventoryDb[req.params.itemId];
    const amount = req.body.amount;
    if (item && item.quantity >= amount) {
        item.quantity -= amount;
        res.status(200).json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Insufficient inventory' });
    }
});

inventoryApp.listen(3001, () => console.log('📦 Inventory Service running on port 3001'));

// ----------------------------------------------------------------------------
// 2. PAYMENT SERVICE (DỊCH VỤ MỚI)
// ----------------------------------------------------------------------------
const paymentApp = express();
paymentApp.use(express.json());

paymentApp.post('/api/payments/process', (req, res) => {
    const { customerId, amountToPay } = req.body;
    console.log(`[Payment Service] Đang xử lý thanh toán $${amountToPay} cho khách ${customerId}...`);
    
    // Giả lập thanh toán thành công
    res.status(200).json({ success: true, transactionId: `TXN-${Math.random()}` });
});

paymentApp.listen(3003, () => console.log('💳 Payment Service running on port 3003'));

// ----------------------------------------------------------------------------
// 3. ORDER SERVICE (CẬP NHẬT)
// ----------------------------------------------------------------------------
const orderApp = express();
orderApp.use(express.json());

orderApp.post('/api/orders', async (req, res) => {
    const { itemId, amount, customerId } = req.body;

    try {
        // 1. Kiểm tra tồn kho và lấy giá sản phẩm
        const inventoryCheck = await axios.get(`http://localhost:3001/api/inventory/${itemId}`);
        const itemPrice = inventoryCheck.data.data.price;

        if (inventoryCheck.data.data.quantity < amount) {
            return res.status(400).json({ success: false, message: 'Out of stock' });
        }

        // 2. Trừ tồn kho
        await axios.post(`http://localhost:3001/api/inventory/${itemId}/deduct`, { amount });

        // 3. GỌI PAYMENT SERVICE
        const amountToPay = itemPrice * amount;
        await axios.post('http://localhost:3003/api/payments/process', { customerId, amountToPay });

        res.status(201).json({ success: true, message: 'Order created & paid!' });

    } catch (error) {
        console.error(`[Order Service] Error:`, error.message);
        res.status(500).json({ success: false, message: 'Internal Error' });
    }
});

orderApp.listen(3002, () => console.log('🛒 Order Service running on port 3002'));
