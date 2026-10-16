/**
 * DEMO: Khắc phục Nút thắt cổ chai CPU bằng Worker Threads
 * Mô phỏng: Luồng chính vẫn nhận HTTP Request bình thường, 
 * việc nặng được đẩy sang một luồng phụ xử lý độc lập.
 */

// Import module 'worker_threads' có sẵn của Node.js để tạo luồng phụ.
// Trong đó:
// - Worker: Một class (lớp) dùng để tạo ra một luồng (thread) mới tinh.
// - isMainThread: Biến boolean (true/false) kiểm tra xem đoạn code này đang chạy ở luồng chính hay luồng phụ.
// - parentPort: Kênh liên lạc (cổng) để luồng phụ gửi tin nhắn ngược về cho luồng chính.
// - workerData: Chứa dữ liệu (tham số) do luồng chính gửi sang luồng phụ lúc khởi tạo.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Import thư viện Express để dựng một web server xử lý HTTP request
const express = require('express');

// BẮT ĐẦU RẼ NHÁNH CODE: Kiểm tra xem có phải đang đứng ở Luồng Chính (Main Thread) không?
if (isMainThread) {
    // =========================================================
    // LUỒNG CHÍNH (MAIN THREAD): Chỉ đóng vai trò nhận Request (Lễ tân)
    // =========================================================
    
    // Khởi tạo app express
    const app = express();
    const PORT = 3000; // Định nghĩa cổng 3000

    // API 1: Tác vụ siêu nhẹ (Ví dụ: Query một dòng trong Database). 
    // MỤC TIÊU: API này LUÔN LUÔN phải phản hồi cực nhanh, không được phép bị trễ.
    app.get('/api/users', (req, res) => {
        // Trả về JSON ngay lập tức
        res.json({ message: 'Lấy dữ liệu User siêu tốc. Luồng chính vẫn đang rất rảnh!' });
    });

    // API 2: Tác vụ SIÊU NẶNG ngốn CPU (Ví dụ: Nén Video, encode, nén file Excel hàng triệu dòng, mã hóa mã pin)
    app.get('/api/heavy-task', (req, res) => {
        console.log('\n[Main Thread] Nhận yêu cầu nặng. Đang "thuê" một Worker phụ...');
        
        // Tạo một luồng phụ (Worker) và giao việc (ủy thác) cho nó.
        // '__filename' là hằng số của Nodejs trỏ đến chính file hiện tại (worker_demo.js).
        // Tức là Nodejs sẽ đọc lại file này nhưng chạy trên một luồng khác.
        // Khi chạy trên luồng khác, 'isMainThread' sẽ bằng false và code sẽ rơi xuống nhánh 'else' bên dưới.
        const worker = new Worker(__filename, {
            // workerData là gói hàng (dữ liệu) chúng ta gửi cho luồng phụ mang đi xử lý. 
            // Ở đây là số lần lặp: 5 tỷ vòng.
            workerData: { loopCount: 5_000_000_000 }
        });

        // Lắng nghe tín hiệu: Khi Worker phụ làm xong việc, nó sẽ gửi kết quả (message) về đây
        worker.on('message', (result) => {
            console.log('[Main Thread] Worker đã làm xong, tiến hành trả kết quả!');
            // Luồng chính cầm kết quả đó (result) và gửi trả về cho Trình duyệt/Client
            res.json({ message: 'Tác vụ nặng đã hoàn tất!', data: result });
        });

        // Bắt lỗi: Nếu trong quá trình cày cuốc, Worker bị lỗi tung chảo
        worker.on('error', (err) => {
            // Luồng chính không bị crash theo, mà chỉ nhẹ nhàng báo về cho Client mã lỗi 500
            res.status(500).json({ error: 'Worker gặp sự cố!', detail: err.message });
        });
    });

    // Luồng chính bắt đầu khởi động Web Server và lắng nghe ở cổng 3000
    app.listen(PORT, () => {
        console.log(`🚀 Server Worker Demo chạy tại http://localhost:${PORT}`);
        console.log(`1. Bấm vào link này chạy task siêu nặng: http://localhost:3000/api/heavy-task`);
        console.log(`2. Ngay sau đó (trong lúc tab kia đang xoay tròn), mở tab khác bấm link này: http://localhost:3000/api/users`);
        console.log(`=> Kết quả: Bạn sẽ thấy Tab 2 trả về JSON NGAY LẬP TỨC dù Tab 1 vẫn đang quay! Chứng tỏ luồng chính KHÔNG BỊ NGHẼN.`);
    });

} else {
    // =========================================================
    // LUỒNG PHỤ (WORKER THREAD): Nô lệ chuyên cày cuốc việc nặng
    // =========================================================
    // Toàn bộ code trong khối 'else' này sẽ được hệ điều hành sắp xếp chạy trên 
    // một lõi CPU (Core) hoàn toàn khác biệt với Luồng Chính.
    
    console.log('[Worker Thread] Bắt đầu cày cuốc công việc ngốn CPU...');
    
    // Khởi tạo biến đếm
    let count = 0;
    
    // Bóc tách biến loopCount (5 tỷ) từ cục hàng 'workerData' do Luồng chính gửi sang
    const { loopCount } = workerData;
    
    // Bắt đầu giả lập một vòng lặp vắt kiệt sức CPU.
    // LƯU Ý SỐNG CÒN: NẾU BẠN VIẾT VÒNG LẶP NÀY Ở TRÊN LUỒNG CHÍNH (nhánh if ở trên), 
    // TOÀN BỘ TRANG WEB SẼ BỊ TREO (ĐƠ) HÀNG CHỤC GIÂY.
    // Nhưng vì ở đây nó chạy trong Worker Thread độc lập, Main Thread vẫn sống khỏe mạnh và tự do.
    for (let i = 0; i < loopCount; i++) {
        // Cứ mỗi vòng lặp thì cộng lên 1
        count++;
    }
    
    console.log('[Worker Thread] Làm xong! Đang đóng gói kết quả gửi về...');
    
    // Sau khi vòng lặp cực nhọc kết thúc, luồng phụ dùng 'parentPort' 
    // để bắn (postMessage) kết quả (số count) bay ngược về lại cho Luồng Chính.
    parentPort.postMessage({ finalCount: count, status: 'Success' });
}
