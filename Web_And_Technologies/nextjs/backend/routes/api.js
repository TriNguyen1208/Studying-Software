/**
 * api.js - Định tuyến các API endpoints
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');

// Routes sản phẩm
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.get('/products/:id/reviews', productController.getProductReviews);

// Routes đơn hàng & sự kiện
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getAllOrders);
router.get('/events', orderController.streamEvents);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
