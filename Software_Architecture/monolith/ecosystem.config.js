// File cấu hình chuẩn của PM2 thường được đặt tên là ecosystem.config.js
module.exports = {
  apps: [{
    name: "my-monolith-app", // Tên hiển thị khi gõ lệnh 'pm2 status'
    script: "./app.js",      // File gốc của ứng dụng

    // ----------------------------------------------------
    // CẤU HÌNH NHÂN BẢN CLUSTER MODE (Chống nghẽn CPU)
    // ----------------------------------------------------
    instances: "max",        // "max" có nghĩa là PM2 tự dò xem CPU có bao nhiêu nhân, nó sẽ nhân bản ứng dụng bấy nhiêu lần.
    exec_mode: "cluster",    // Bật chế độ chạy Cluster. PM2 tự kèm một Load Balancer chia nhỏ request.

    // ----------------------------------------------------
    // CÁC CẤU HÌNH BẢO VỆ "SỨC KHỎE" ỨNG DỤNG
    // ----------------------------------------------------
    watch: false,                  // Nếu bằng true, tự restart app khi có file code thay đổi (chỉ nên bật lúc code - dev)
    max_memory_restart: "1G",      // CHỐNG CRASH HỆ THỐNG: Nếu ứng dụng bị phình to ngốn quá 1GB RAM, PM2 sẽ tự động kill và bật lại nó một cách mềm mại.
    autorestart: true,             // Tự động khởi động lại khi crash do lỗi code (mặc định là true)

    // Khởi tạo các biến môi trường
    env: {
      NODE_ENV: "development",
      PORT: 3000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 80
    }
  }]
};

// ============================================
// CÁC LỆNH PM2 CƠ BẢN ĐỂ CHẠY FILE NÀY:
// ============================================
// 1. Khởi động app:        pm2 start ecosystem.config.js
// 2. Khởi động app(Prod):  pm2 start ecosystem.config.js --env production
// 3. Xem danh sách app:    pm2 status
// 4. Xem log tập trung:    pm2 logs my-monolith-app
// 5. Khởi động lại (Load): pm2 reload my-monolith-app (Zero-downtime)
// 6. Ngừng app:            pm2 stop my-monolith-app
