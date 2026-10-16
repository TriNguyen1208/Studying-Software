/**
 * DEMO NÂNG CAO: LOAD BALANCER TÍCH HỢP TRONG NODE.JS BẰNG CLUSTER
 * Mô phỏng lại chính xác cách PM2 hoạt động ở chế độ Cluster Mode.
 * Ý tưởng: Chạy 1 "Tiến trình Master" làm Load Balancer, 
 * và nhân bản ứng dụng Monolith thành nhiều "Tiến trình Worker".
 */

// Import module 'cluster' có sẵn của Node.js để quản lý tiến trình đa nhân
const cluster = require('cluster');
// Import module 'os' (Operating System) để tương tác với hệ điều hành (như lấy số nhân CPU)
const os = require('os');
// Import thư viện 'express' để tạo web server nhanh chóng
const express = require('express');

// Sử dụng hàm os.cpus() để lấy mảng chứa thông tin từng nhân CPU. .length để đếm số lượng nhân.
// Ví dụ máy có 4 nhân (4 cores), biến numCPUs sẽ có giá trị là 4.
const numCPUs = os.cpus().length;

// Kiểm tra xem tiến trình hiện tại đang chạy có phải là tiến trình gốc (Master/Primary) hay không.
// Lần đầu tiên bạn gõ lệnh chạy file (node cluster_demo.js), nó LUÔN LUÔN là Master.
if (cluster.isPrimary || cluster.isMaster) {
    // ========================================================================
    // 1. TIẾN TRÌNH MASTER (LOAD BALANCER & QUẢN LÝ)
    // ========================================================================
    // In ra màn hình cho biết Master đã khởi động, kèm theo mã số tiến trình (PID - Process ID)
    console.log(`[Master] Khởi động Load Balancer (Master PID: ${process.pid})`);
    console.log(`[Master] Phát hiện máy chủ có ${numCPUs} nhân CPU. Đang tiến hành nhân bản ứng dụng...\n`);

    // Vòng lặp: Lặp qua số lượng nhân CPU để tạo ra số lượng bản sao (Worker) tương ứng.
    // Điều này đảm bảo mỗi nhân CPU sẽ "gánh" 1 bản sao, tận dụng 100% tài nguyên máy chủ.
    for (let i = 0; i < numCPUs; i++) {
        // Hàm fork() thần thánh: Nó sẽ copy toàn bộ file code này và chạy lại nó 
        // trên một tiến trình hoàn toàn mới (Gọi là Worker).
        // Khi chạy lại ở tiến trình mới, biến cluster.isMaster sẽ là false (rơi vào nhánh else bên dưới).
        cluster.fork(); 
    }

    // TÍNH NĂNG TỰ PHỤC HỒI (AUTO-HEALING)
    // Master đóng vai trò là "Người giám sát". Nó lắng nghe sự kiện 'exit' (thất thoát) từ bất kỳ Worker nào.
    // Nếu một Worker bị văng lỗi (crash) và sập, Master sẽ nhận được tín hiệu báo tử.
    cluster.on('exit', (worker, code, signal) => {
        // In ra thông báo có một Worker vừa chết
        console.log(`\n[Master] ❌ CẢNH BÁO: Bản sao (Worker PID: ${worker.process.pid}) vừa bị chết!`);
        console.log(`[Master] 🔄 Đang tự động gọi bản sao mới lên thay thế...`);
        // Khởi tạo ngay lập tức một Worker mới bù đắp vào chỗ trống, giữ cho hệ thống không bao giờ sụt giảm công suất
        cluster.fork(); 
    });

} else {
    // ========================================================================
    // 2. TIẾN TRÌNH WORKER (CHÍNH LÀ ỨNG DỤNG MONOLITH CỦA BẠN)
    // ========================================================================
    // Đoạn code từ đây trở xuống CHỈ CHẠY bên trong các bản sao (Worker). 
    // Nếu máy có 4 nhân CPU, đoạn code này sẽ được chạy 4 lần độc lập trên 4 Process riêng biệt.
    
    // Khởi tạo một app Express (Web server)
    const app = express();
    // Cài đặt cổng mạng là 3000
    const PORT = 3000;

    // Định nghĩa API trang chủ (phản hồi GET Request)
    app.get('/', (req, res) => {
        // Trả về một chuỗi JSON chứa thông tin để Client (Trình duyệt) 
        // biết họ đang lọt vào tay (được xử lý bởi) bản sao nào.
        res.json({
            message: '🚀 Chào mừng đến với Monolith Cluster Mode!',
            // Biến process.pid chứa mã định danh (Process ID) duy nhất của Worker đang xử lý Request này
            handledBy: `Được xử lý bởi bản sao có PID: ${process.pid}`,
            note: 'Hãy F5 (Refresh) liên tục trình duyệt! Bạn sẽ thấy thông số PID thay đổi liên tục, chứng tỏ Load Balancer (Master) đang chia đều khách cho các bản sao!'
        });
    });

    // Định nghĩa một API "gài mìn" - Cố tình tạo một API gây lỗi nghiêm trọng (Làm sập ứng dụng) để test tính năng Auto-Healing
    app.get('/crash', (req, res) => {
        // In ra log để chứng minh Worker nào (dựa trên PID) sắp "tự sát"
        console.log(`[Worker ${process.pid}] Đang tự sát... BOOM 💥`);
        // process.exit(1) ra lệnh cho Node.js ngay lập tức đóng tiến trình hiện hành.
        // Mã (1) ám chỉ rằng nó kết thúc một cách không bình thường (bị lỗi).
        process.exit(1); 
    });

    // Bắt đầu lắng nghe các HTTP Request trên cổng 3000
    // ĐIỂM THẦN KỲ CỦA CLUSTER: Bình thường nếu 4 app cùng nghe 1 cổng (Port) sẽ báo lỗi "Port in use" (Trùng cổng).
    // Nhưng vì ở đây chúng được sinh ra và quản lý bởi Master, Master sẽ là người đứng chốt chặn nghe cổng 3000 thực sự, 
    // và âm thầm phân phát Request xuống cho các Worker bên dưới xử lý. Các Worker không hề bị giành giật port.
    app.listen(PORT, () => {
        // Thông báo Worker đã khởi chạy thành công và sẵn sàng nhận việc.
        console.log(`  -> [Worker] Bản sao Monolith (PID: ${process.pid}) đã sẵn sàng phục vụ.`);
    });
}
