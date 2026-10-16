/**
 * ============================================================================
 * ORDER & OBSERVABILITY ROUTES
 * ============================================================================
 * Đoạn này làm gì?
 * - Cung cấp các endpoints RESTful để tương tác với nghiệp vụ đơn hàng.
 * - Cung cấp các API giả lập sự cố (Chaos Endpoints: simulate-slow, simulate-error, simulate-burst)
 *   giúp người học dễ dàng quan sát sự thay đổi trên Prometheus, Grafana, Loki và Jaeger.
 * - Cung cấp endpoint lấy telemetry tóm tắt phục vụ trực tiếp cho Frontend.
 */

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const inventoryService = require('../services/inventoryService');
const { recentLogsBuffer } = require('../logger');
const { register } = require('../metrics');

// 1. Lấy danh sách sản phẩm trong kho
router.get('/inventory', (req, res) => {
  res.json({
    success: true,
    data: inventoryService.getAllItems(),
  });
});

// 2. Đặt hàng chuẩn (Happy Path)
router.post('/orders', async (req, res, next) => {
  try {
    const { itemId = 'item-macbook', quantity = 1, customerId } = req.body;
    const order = await orderService.createOrder({ itemId, quantity, customerId });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// 3. Giả lập đơn hàng xử lý chậm (Latency Spike - Kiểm chứng Histogram & Tracing Span dài)
router.post('/orders/simulate-slow', async (req, res, next) => {
  try {
    const { itemId = 'item-sony', quantity = 1, delayMs = 2000 } = req.body;
    const order = await orderService.createOrder({
      itemId,
      quantity,
      customerId: 'cust_latency_test',
      simulateDelayMs: delayMs,
    });
    res.status(201).json({
      success: true,
      message: `Đơn hàng đã được xử lý với độ trễ nhân tạo ${delayMs}ms. Kiểm tra Jaeger và Grafana P95!`,
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Giả lập đơn hàng gặp lỗi sập hệ thống (Chaos Error - Kiểm chứng 5xx Counter & Error Log trong Loki)
router.post('/orders/simulate-error', async (req, res, next) => {
  try {
    const { itemId = 'item-iphone', quantity = 1 } = req.body;
    await orderService.createOrder({
      itemId,
      quantity,
      customerId: 'cust_chaos_test',
      simulateFail: true,
    });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 5. Giả lập đợt bùng nổ lưu lượng (Burst Traffic - Stress Test RPS)
router.post('/orders/simulate-burst', async (req, res) => {
  const { count = 10 } = req.body;
  const items = ['item-macbook', 'item-iphone', 'item-sony', 'item-keychron'];

  const promises = Array.from({ length: count }).map(async (_, idx) => {
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const shouldFail = Math.random() < 0.2; // 20% khả năng lỗi
    const delay = Math.random() < 0.3 ? 800 : 50; // 30% khả năng chậm
    try {
      return await orderService.createOrder({
        itemId: randomItem,
        quantity: 1,
        customerId: `cust_burst_${idx + 1}`,
        simulateFail: shouldFail,
        simulateDelayMs: delay,
      });
    } catch (_err) {
      return { status: 'FAILED' };
    }
  });

  const results = await Promise.all(promises);
  res.json({
    success: true,
    message: `Đã phát sinh ${count} giao dịch đồng thời để kích hoạt biểu đồ Throughput & Error Rate!`,
    totalSent: count,
    completed: results.filter((r) => r.status === 'COMPLETED').length,
    failed: results.filter((r) => r.status === 'FAILED').length,
  });
});

// 6. Lấy 50 đơn hàng gần nhất
router.get('/orders/recent', (req, res) => {
  res.json({
    success: true,
    data: orderService.getRecentOrders(),
  });
});

// 7. Lấy dữ liệu Telemetry tổng hợp cho Frontend Dashboard
router.get('/observability/stats', async (req, res) => {
  try {
    const rawMetrics = await register.metrics();
    const recentOrders = orderService.getRecentOrders();

    res.json({
      success: true,
      data: {
        recentOrders,
        recentLogs: recentLogsBuffer.slice(-50).reverse(), // 50 log mới nhất
        servicesStatus: {
          prometheus: 'http://localhost:9090',
          grafana: 'http://localhost:3000',
          loki: 'http://localhost:3100',
          jaeger: 'http://localhost:16686',
        },
        rawMetricsSnippet: rawMetrics.substring(0, 3000), // Preview 3000 ký tự metrics
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
