/**
 * BÀI DEMO: CHỨNG MINH BẢN CHẤT EVENT LOOP VÀ NON-BLOCKING CỦA NODE.JS
 * 
 * Hướng dẫn: Bạn hãy mở terminal, chạy lệnh `node event_loop_demo.js`
 * Nhưng trước khi chạy, hãy thử đọc code và ĐOÁN XEM thứ tự các dòng log in ra 
 * sẽ như thế nào nhé? Khẳng định là nó không in từ trên xuống dưới đâu!
 */

// Import thư viện 'fs' (File System) tích hợp sẵn để giao tiếp với Ổ cứng
const fs = require('fs');

// Import thư viện 'crypto' để mượn các hàm mã hóa (mô phỏng việc tính toán nặng)
const crypto = require('crypto');

// =========================================================================
// 1. TÁC VỤ ĐỒNG BỘ (Synchronous) - Luôn chiếm quyền cao nhất
// =========================================================================
// Các lệnh chạy thẳng tuột (không gọi Callback, không dính tới I/O) sẽ được 
// Luồng chính (Main Thread) thực thi ngay lập tức khi đọc từ trên xuống.
console.log('1. [ĐỒNG BỘ] Luồng chính bắt đầu chạy code.');


// =========================================================================
// 2. TÁC VỤ TIMER BẤT ĐỒNG BỘ (Timer Queue)
// =========================================================================
// Hàm setTimeout lệnh cho Node.js chờ 0 giây (Tức là ngay lập tức).
// Tuy nhiên, vì cơ chế Non-Blocking, Luồng chính KHÔNG ĐỨNG CHỜ dù chỉ 0 giây.
// Nó ném cái hàm mũi tên (Callback) này vào một Hàng đợi có tên là "Timer Queue".
// Event Loop sẽ quay lại nhặt hàm này lên chạy SAU KHI luồng chính rảnh tay.
setTimeout(() => {
    console.log('2. [TIMER QUEUE] Dòng này chạy từ hàm setTimeout (Hẹn giờ 0 giây).');
}, 0);


// =========================================================================
// 3. TÁC VỤ I/O BẤT ĐỒNG BỘ (I/O Queue - Non-blocking)
// =========================================================================
// Luồng chính gọi hệ điều hành: "Anh bạn ổ cứng, hãy đọc cái file này (__filename) dùm tôi!"
// Ngay sau khi dặn dò xong, Luồng chính BỎ ĐI NGAY LẬP TỨC xuống dòng code bên dưới.
// Nó không hề bị block bởi tốc độ rùa bò của ổ đĩa HDD/SSD.
fs.readFile(__filename, () => {
    // Đoạn code này chỉ chạy khi hệ điều hành báo là "Đã đọc xong file".
    console.log('3. [I/O QUEUE] Đã đọc xong ổ cứng! Tác vụ mạng/ổ cứng luôn tốn thời gian nhất.');
    
    // ĐÀO SÂU: Gài bẫy bên trong I/O callback
    // Khi đang nằm trong pha xử lý I/O, Event Loop có một quy tắc: 
    // Hàm setImmediate sẽ luôn luôn được chèn lên chạy trước hàm setTimeout.
    setTimeout(() => console.log('   3.1 [Bên trong I/O] Dù tôi là setTimeout(0), tôi vẫn xếp sau setImmediate.'), 0);
    setImmediate(() => console.log('   3.2 [Bên trong I/O] setImmediate (Check Queue) luôn chạy ngay sau I/O.'));
});


// =========================================================================
// 4. MICROTASK QUEUE (Hàng đợi Vi mô - Dành cho VIP)
// =========================================================================
// Hàm Promise.resolve() tạo ra một lời hứa thành công ngay lập tức.
// Code trong khối .then() sẽ được đưa vào Hàng đợi "Microtask".
// LUẬT CỦA EVENT LOOP: Hàng đợi Microtask là hạng khách VIP. Event loop phải
// giải quyết sạch sẽ hàng đợi này rồi mới được phép đụng tới hàng đợi Timer ở bước 2.
Promise.resolve().then(() => {
    console.log('4. [MICROTASK QUEUE] Dòng này từ Promise. Đội ngũ VIP, được ưu tiên vượt mặt Timer!');
});


// =========================================================================
// 5. NEXT TICK QUEUE (VIP TỐI THƯỢNG)
// =========================================================================
// Hàm process.nextTick() cũng thuộc nhóm Microtask, nhưng nó là khách VVIP.
// Nó được Event Loop ưu tiên ĐỨNG ĐẦU MỌI HÀNG ĐỢI (kể cả trên Promise).
// Nó sẽ được chạy NGAY KHI đoạn code đồng bộ cuối cùng của file này dứt.
process.nextTick(() => {
    console.log('5. [NEXT TICK QUEUE] Khách VIP nhất hệ mặt trời, sẽ chạy ngay khi code đồng bộ dứt!');
});


// =========================================================================
// 6. MÔ PHỎNG NÚT THẮT CỔ CHAI (Blocking)
// =========================================================================
console.log('6. [ĐỒNG BỘ] Luồng chính đang giải quyết một việc hơi lâu... Mọi người xếp hàng đợi!');

// Đây là hàm Băm mật khẩu ĐỒNG BỘ (chữ Sync ở cuối).
// Nó buộc CPU phải lặp 10.000.000 lần thuật toán mã hóa.
// HẬU QUẢ: Nó KHÓA CỨNG (BLOCK) luồng chính trong vài giây.
// Trong khoảng thời gian luồng chính bị khóa này, dù cho ổ cứng (Bước 3) đã đọc xong file, 
// hay Timer (Bước 2) đã nhảy xong số, thì những tín hiệu đó đều phải NẰM IM TRONG HÀNG ĐỢI.
crypto.pbkdf2Sync('password', 'salt', 10000000, 64, 'sha512');

console.log('7. [ĐỒNG BỘ] Luồng chính băm mật khẩu xong rồi, bắt đầu đi thu thập các tác vụ ngầm!');


/**
 * =========================================================================
 * ĐÁP ÁN: THỨ TỰ THỰC SỰ IN RA MÀN HÌNH SAU KHI BẠN CHẠY CODE LÀ GÌ?
 * =========================================================================
 * 
 * BƯỚC 1 - Quét code đồng bộ từ trên xuống dưới:
 *   -> Số 1, Số 6, Số 7 (Vì đây là code đồng bộ thuần, chạy thẳng tắp bỏ qua mọi thứ)
 * 
 * BƯỚC 2 - Event Loop bắt đầu chạy và kiểm tra Hàng đợi VIP (Microtask):
 *   -> Số 5 (nextTick - VIP 1)
 *   -> Số 4 (Promise - VIP 2)
 * 
 * BƯỚC 3 - Event Loop sang Hàng đợi Timer (Đã hẹn giờ xong):
 *   -> Số 2 (Timer 0s)
 * 
 * BƯỚC 4 - Hàng đợi I/O (Chờ ổ cứng quay xong - chậm nhất hệ thống):
 *   -> Số 3 (I/O Đọc file xong)
 *   -> Event loop lại thấy 2 thằng con bên trong. Nó đẩy vào hàng đợi tiếp.
 *   -> Số 3.2 (setImmediate được ưu tiên giải quyết trước khi nằm trong chu kỳ I/O)
 *   -> Số 3.1 (setTimeout)
 */
