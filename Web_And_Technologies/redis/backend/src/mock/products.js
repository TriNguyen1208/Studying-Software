/**
 * MOCK DATABASE LAYER
 * Giả lập cơ sở dữ liệu quan hệ (PostgreSQL / MySQL).
 * Truy vấn đĩa vật lý (Disk I/O), tính toán JOIN, và network latency thực tế thường tốn từ 100ms - 300ms.
 */

const mockProducts = [
  {
    id: "prod_1",
    name: "MacBook Pro M3 Max 64GB",
    category: "Laptops",
    price: 3499,
    description: "Chip Apple M3 Max với 16 lõi CPU và 40 lõi GPU, 1TB SSD.",
    stock: 5, // Dùng cho bài toán Flash Sale Concurrency
    rating: 4.9,
    reviewsCount: 1280
  },
  {
    id: "prod_2",
    name: "iPhone 15 Pro Titanium 256GB",
    category: "Smartphones",
    price: 1199,
    description: "Khung viền Titan chuẩn hàng không vũ trụ, chip A17 Pro.",
    stock: 3,
    rating: 4.8,
    reviewsCount: 4520
  },
  {
    id: "prod_3",
    name: "Sony WH-1000XM5 Noise Canceling",
    category: "Audio",
    price: 399,
    description: "Tai nghe chống ồn chủ động đỉnh cao, pin 30 giờ.",
    stock: 50,
    rating: 4.7,
    reviewsCount: 930
  },
  {
    id: "prod_4",
    name: "Dell UltraSharp 32 4K USB-C Hub",
    category: "Monitors",
    price: 899,
    description: "Màn hình IPS Black với độ tương phản 2000:1, chuẩn 98% DCI-P3.",
    stock: 20,
    rating: 4.6,
    reviewsCount: 310
  }
];

// Biến lưu trữ số lượng tồn kho mô phỏng trong Database cho Flash Sale
let databaseInventory = {
  "prod_flash_sale": 5 // Chỉ có 5 sản phẩm duy nhất cho 50 người mua
};

/**
 * Giả lập độ trễ truy vấn Database (Disk I/O + B-Tree lookup + Network latency)
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findProductFromDatabase(productId) {
  // Giả lập database mất từ 150ms đến 250ms để đọc đĩa vật lý
  const latency = Math.floor(Math.random() * 100) + 150;
  await sleep(latency);

  const product = mockProducts.find((p) => p.id === productId);
  return {
    data: product || null,
    dbLatencyMs: latency,
  };
}

async function getAllProductsFromDatabase() {
  const latency = Math.floor(Math.random() * 120) + 180;
  await sleep(latency);
  return {
    data: mockProducts,
    dbLatencyMs: latency,
  };
}

function getDatabaseStock(productId) {
  return databaseInventory[productId] ?? 0;
}

function resetDatabaseStock(productId, initialStock = 5) {
  databaseInventory[productId] = initialStock;
  return databaseInventory[productId];
}

function decrementDatabaseStockUnsafe(productId) {
  // Cố tình tạo một độ trễ nhỏ mô phỏng transaction SELECT FOR UPDATE hoặc read-then-write
  // Đây chính là điểm bùng phát RACE CONDITION (Overselling) trong hệ thống thiếu khóa phân tán
  const current = databaseInventory[productId] ?? 0;
  if (current > 0) {
    // Giả lập thread context switch hoặc delay trong quá trình xử lý payment
    databaseInventory[productId] = current - 1;
    return { success: true, remaining: databaseInventory[productId] };
  }
  return { success: false, remaining: current };
}

module.exports = {
  mockProducts,
  findProductFromDatabase,
  getAllProductsFromDatabase,
  getDatabaseStock,
  resetDatabaseStock,
  decrementDatabaseStockUnsafe,
  sleep,
};
