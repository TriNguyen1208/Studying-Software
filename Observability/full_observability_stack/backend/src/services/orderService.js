/**
 * ============================================================================
 * ORDER SERVICE (ĐIỀU PHỐI ĐƠN HÀNG & PHÂN TÍCH SPAN CHUYÊN SÂU)
 * ============================================================================
 * Đoạn này làm gì?
 * - Điều phối quy trình đặt hàng: Validate -> Giữ kho -> Thanh toán -> Xuất hóa đơn.
 * - Quản lý Prometheus Gauge `activeOrdersGauge` để theo dõi các tác vụ đang chạy.
 * - Tạo cấu trúc Spans phân cấp cha - con (Parent - Child Spans) chuẩn OpenTelemetry.
 * - Lưu lại lịch sử 50 đơn hàng gần nhất kèm Trace ID và sơ đồ Span Waterfall
 *   để Frontend có thể hiển thị trực quan ngay lập tức.
 */

const { v4: uuidv4 } = require('uuid');
const { withSpan, getCurrentTraceContext } = require('../tracer');
const { activeOrdersGauge } = require('../metrics');
const { logger } = require('../logger');
const inventoryService = require('./inventoryService');
const paymentService = require('./paymentService');

// Bộ nhớ đệm lưu 50 đơn hàng gần nhất
const processedOrders = [];
const MAX_ORDERS_CACHE = 50;

async function createOrder({ itemId, quantity, customerId, simulateFail = false, simulateDelayMs = 0 }) {
  const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const startTime = Date.now();

  // Tăng Gauge số lượng đơn hàng đang xử lý (In-flight requests)
  activeOrdersGauge.inc();

  // Tạo Span cha bao bọc toàn bộ chu trình xử lý đơn hàng
  return withSpan('order.process_checkout', {
    'order.id': orderId,
    'order.item_id': itemId,
    'order.quantity': quantity,
    'customer.id': customerId || 'cust_anonymous_99',
  }, async (parentSpan) => {
    logger.info(`[OrderService] Bắt đầu tiếp nhận đơn hàng mới ${orderId}`, {
      orderId,
      itemId,
      quantity,
    });

    const spansTimeline = [];
    const recordSubSpan = (name, startMs, endMs, status = 'OK', details = {}) => {
      spansTimeline.push({
        name,
        durationMs: endMs - startMs,
        offsetMs: startMs - startTime,
        status,
        details,
      });
    };

    try {
      // 1. Chặng 1: Kiểm tra tính hợp lệ & chống gian lận (Validation & Fraud Check)
      const t1Start = Date.now();
      await withSpan('order.fraud_check', { 'order.id': orderId }, async () => {
        // Mô phỏng tính toán CPU thuật toán chấm điểm rủi ro
        await new Promise((r) => setTimeout(r, 20));
      });
      const t1End = Date.now();
      recordSubSpan('order.fraud_check', t1Start, t1End, 'OK');

      // 2. Chặng 2: Giữ hàng trong kho (Inventory Reservation)
      const t2Start = Date.now();
      const reservedItem = await inventoryService.checkAndReserveStock(
        itemId,
        quantity,
        simulateDelayMs > 0 ? Math.floor(simulateDelayMs * 0.4) : 0
      );
      const t2End = Date.now();
      recordSubSpan('inventory.check_and_reserve', t2Start, t2End, 'OK', { stock: reservedItem.stock });

      // 3. Chặng 3: Xử lý thanh toán (Payment Gateway Charge)
      const totalAmount = reservedItem.price * quantity;
      parentSpan.setAttribute('order.total_amount', totalAmount);

      const t3Start = Date.now();
      const paymentResult = await paymentService.processPayment({
        orderId,
        amount: totalAmount,
        customerId,
        simulateFail,
        simulateDelayMs: simulateDelayMs > 0 ? Math.floor(simulateDelayMs * 0.6) : 0,
      });
      const t3End = Date.now();
      recordSubSpan('payment.gateway_charge', t3Start, t3End, 'OK', { txn: paymentResult.transactionId });

      // 4. Chặng 4: Tạo hóa đơn và lưu trữ điện tử (Invoice Generation)
      const t4Start = Date.now();
      await withSpan('order.generate_invoice', { 'order.id': orderId }, async () => {
        await new Promise((r) => setTimeout(r, 35));
      });
      const t4End = Date.now();
      recordSubSpan('order.generate_invoice', t4Start, t4End, 'OK');

      const totalDuration = Date.now() - startTime;
      const { traceId } = getCurrentTraceContext();

      const completedOrder = {
        orderId,
        traceId: traceId || 'local_trace_id',
        status: 'COMPLETED',
        item: reservedItem.name,
        quantity,
        amount: totalAmount,
        durationMs: totalDuration,
        timestamp: new Date().toISOString(),
        spansTimeline,
      };

      if (processedOrders.length >= MAX_ORDERS_CACHE) {
        processedOrders.pop();
      }
      processedOrders.unshift(completedOrder);

      logger.info(`[OrderService] Đơn hàng ${orderId} đã hoàn tất thành công trong ${totalDuration}ms`, {
        orderId,
        totalAmount,
        totalDuration,
      });

      return completedOrder;
    } catch (err) {
      const totalDuration = Date.now() - startTime;
      const { traceId } = getCurrentTraceContext();

      parentSpan.recordException(err);
      parentSpan.setStatus({ code: 2, message: err.message }); // 2 = ERROR trong OTel

      const failedOrder = {
        orderId,
        traceId: traceId || 'local_trace_id',
        status: 'FAILED',
        error: err.message,
        itemId,
        quantity,
        durationMs: totalDuration,
        timestamp: new Date().toISOString(),
        spansTimeline,
      };

      if (processedOrders.length >= MAX_ORDERS_CACHE) {
        processedOrders.pop();
      }
      processedOrders.unshift(failedOrder);

      logger.error(`[OrderService] Xử lý đơn hàng ${orderId} thất bại: ${err.message}`, {
        orderId,
        error: err.message,
        totalDuration,
      });

      throw err;
    } finally {
      // Giảm Gauge sau khi request hoàn tất (thành công hoặc thất bại)
      activeOrdersGauge.dec();
    }
  });
}

function getRecentOrders() {
  return processedOrders;
}

module.exports = {
  createOrder,
  getRecentOrders,
};
