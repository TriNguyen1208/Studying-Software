/**
 * ============================================================================
 * INVENTORY SERVICE (QUẢN LÝ KHO HÀNG & METRICS GAUGE)
 * ============================================================================
 * Đoạn này làm gì?
 * - Quản lý tồn kho hàng hóa và cập nhật Prometheus Gauge (inventory_stock_quantity).
 * - Sử dụng OpenTelemetry `withSpan` để ghi nhận thời gian truy vấn dữ liệu kho.
 * - Mô phỏng độ trễ truy vấn Database (Disk I/O và Table Lock).
 */

const { withSpan } = require('../tracer');
const { inventoryStockGauge } = require('../metrics');
const { logger } = require('../logger');

// Dữ liệu kho hàng ban đầu
const inventory = {
  'item-macbook': { id: 'item-macbook', name: 'MacBook Pro M3 Max 64GB', stock: 45, price: 3499 },
  'item-iphone': { id: 'item-iphone', name: 'iPhone 16 Pro Max 512GB', stock: 80, price: 1399 },
  'item-sony': { id: 'item-sony', name: 'Sony WH-1000XM5 Headphone', stock: 120, price: 399 },
  'item-keychron': { id: 'item-keychron', name: 'Keychron Q1 Pro Mechanical Keyboard', stock: 65, price: 219 },
};

// Khởi tạo số liệu Gauge ban đầu cho Prometheus
Object.values(inventory).forEach((item) => {
  inventoryStockGauge.set({ item_id: item.id, item_name: item.name }, item.stock);
});

async function checkAndReserveStock(itemId, quantity, simulateDelayMs = 0) {
  return withSpan('inventory.check_and_reserve', { 'inventory.item_id': itemId, 'inventory.quantity': quantity }, async (span) => {
    logger.info(`[InventoryService] Đang kiểm tra tồn kho mặt hàng ${itemId}`, { itemId, quantity });

    // Mô phỏng độ trễ Database I/O hoặc Row Lock
    if (simulateDelayMs > 0) {
      span.setAttribute('inventory.lock_contention', true);
      span.setAttribute('inventory.delay_ms', simulateDelayMs);
      await new Promise((resolve) => setTimeout(resolve, simulateDelayMs));
    }

    const item = inventory[itemId];
    if (!item) {
      const err = new Error(`Mặt hàng ${itemId} không tồn tại trong kho.`);
      logger.warn(`[InventoryService] Không tìm thấy sản phẩm ${itemId}`, { itemId });
      throw err;
    }

    if (item.stock < quantity) {
      const err = new Error(`Hết hàng! Mặt hàng ${item.name} chỉ còn ${item.stock}, yêu cầu ${quantity}.`);
      logger.warn(`[InventoryService] Thiếu hụt tồn kho`, { itemId, currentStock: item.stock, quantity });
      throw err;
    }

    // Trừ kho và cập nhật Prometheus Gauge
    item.stock -= quantity;
    inventoryStockGauge.set({ item_id: item.id, item_name: item.name }, item.stock);

    span.setAttribute('inventory.remaining_stock', item.stock);
    logger.info(`[InventoryService] Giữ kho thành công cho ${item.name}. Số lượng còn lại: ${item.stock}`, {
      itemId,
      remainingStock: item.stock,
    });

    return { ...item, reservedQuantity: quantity };
  });
}

function getAllItems() {
  return Object.values(inventory);
}

module.exports = {
  checkAndReserveStock,
  getAllItems,
};
