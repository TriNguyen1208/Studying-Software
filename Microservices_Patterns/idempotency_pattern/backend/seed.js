const { initDatabase, pool } = require('./src/config/database');
const paymentService = require('./src/services/paymentService');

async function seed() {
  console.log('[Seed] Đang khởi tạo database và nạp dữ liệu mẫu...');
  try {
    await initDatabase();
    const result = await paymentService.resetDatabase();
    console.log('[Seed]', result.message);
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Thất bại khi nạp dữ liệu:', error);
    process.exit(1);
  }
}

seed();
