/**
 * ==============================================================================
 * PRODUCTION-GRADE PM2 ECOSYSTEM CONFIGURATION
 * ==============================================================================
 * File cấu hình hệ sinh thái tiến trình cho PM2 trong môi trường Production.
 * Khởi chạy cụm Cluster gồm 4 Worker Processes chia sẻ chung cổng mạng 3000.
 */

module.exports = {
  apps: [
    {
      name: 'node-cluster-fleet',
      script: './src/server.js',

      // 1. CLUSTER MODE & ĐIỀU PHỐI ĐA NHÂN CPU
      // Chạy 4 instances để tận dụng tối đa tài nguyên đa nhân
      instances: 4,
      exec_mode: 'cluster',

      // 2. BẢO ĐẢM ZERO-DOWNTIME RELOAD
      // Chờ ứng dụng phát tín hiệu process.send('ready') sau khi đã nạp xong mọi thứ
      wait_ready: true,
      listen_timeout: 10000, // Chờ tối đa 10s trước khi coi worker mới khởi động thất bại
      kill_timeout: 5000,   // Cho worker cũ 5s để drain connection trước khi cưỡng chế kill

      // 3. PHÒNG CHỐNG RÒ RỈ BỘ NHỚ (MEMORY LEAK PROTECTION)
      // Tự động khởi động lại worker nếu lượng RAM (RSS) vượt quá 120MB
      max_memory_restart: '120M',

      // 4. CHỐNG CRASH LOOP (FLAPPING PREVENTION)
      // Nếu worker crash liên tục trong vòng 4s đầu tiên sau khi bật, PM2 sẽ kìm hãm để bảo vệ CPU
      min_uptime: '4s',
      max_restarts: 15,

      // 5. QUẢN LÝ VÀ GOM LOGS TẬP TRUNG
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/cluster-err.log',
      out_file: './logs/cluster-out.log',

      // 6. BIẾN MÔI TRƯỜNG PHÂN THEO PROFILE
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
