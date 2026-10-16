# Bản chất cốt lõi của Node.js (Từ A đến Z)

> **Ý tưởng chính việc sử dụng:** Chạy JavaScript ngoài trình duyệt, hỗ trợ non-blocking I/O để phục vụ đồng thời hàng ngàn kết nối.
> **Ví dụ:** Xây dựng máy chủ Web Server xử lý Real-time chat bằng Socket.io tốc độ cao.


## 1. Node.js thực chất là gì?
Rất nhiều người lầm tưởng Node.js là một ngôn ngữ lập trình hoặc một Framework (giống như React hay Spring). Sự thật là:
**Node.js là một Môi trường thực thi (Runtime Environment) đa nền tảng dành cho Javascript.**

Để hiểu điều này:
- Bình thường, ngôn ngữ Javascript chỉ có thể chạy được ở bên trong **Trình duyệt web** của người dùng, nhờ các bộ dịch (Engine) như **V8 Engine** của Google Chrome. JS sinh ra chỉ để đổi màu nút bấm, hiển thị popup... chứ không thể truy cập vào ổ cứng hay mạng máy tính.
- Năm 2009, Ryan Dahl (người tạo ra Node.js) đã nảy ra ý tưởng: Ông lấy cái lõi **V8 Engine** cực mạnh đó bứng ra khỏi trình duyệt, bọc nó lại bằng ngôn ngữ C/C++, và cung cấp thêm cho nó các thư viện để nó có khả năng ra lệnh cho hệ điều hành (đọc ghi file ổ cứng, mở cổng mạng kết nối Internet, truy xuất Database).
- Từ đó Node.js ra đời, giúp Javascript có thể chạy trực tiếp trên Máy chủ (Server / Backend) y như Java, Python, C#.

## 2. Hai "trái tim" cấu thành nên Node.js
Nếu "mổ xẻ" Node.js, bạn sẽ thấy 2 thành phần cốt lõi nhất:
1. **V8 Engine (Bởi Google):** Chịu trách nhiệm dịch code Javascript của bạn thành mã máy (Machine code) để CPU máy tính hiểu được.
2. **libuv:** Một thư viện viết bằng ngôn ngữ C thuần túy. Đây chính là vũ khí bí mật làm nên tên tuổi của Node. Nó cung cấp cho Node.js 2 thứ: cơ chế **Vòng lặp sự kiện (Event Loop)** và một **Hồ chứa luồng ẩn (Worker Thread Pool)** để giao tiếp với Hệ điều hành máy chủ.

## 3. Ba đặc tính vàng tạo nên sức mạnh của Node.js
Node.js sinh ra để giải quyết bài toán "C10K" (Làm sao để 1 server cõng được 10.000 kết nối đồng thời). Để làm được, nó vận hành dựa trên 3 nguyên lý:

### A. Single-Threaded (Đơn luồng)
Không giống như Java hay PHP - cứ có 1 user truy cập là tạo ra 1 luồng (Thread) mới tốn RAM. **Node.js chỉ sử dụng đúng 1 Luồng duy nhất (Main Thread)** để chạy toàn bộ code Javascript của tất cả người dùng. Nghe có vẻ yếu đuối, nhưng nhờ đặc tính B dưới đây, nó lại vô cùng bá đạo.

### B. Non-Blocking I/O (Vào/Ra Không Chặn)
I/O (Input/Output) là các tác vụ cực kỳ chậm chạp liên quan đến phần cứng (ổ cứng, mạng, gọi API, gọi Database).
- Trong các ngôn ngữ khác (Cơ chế Blocking): Khi code chạy đến dòng lệnh "Đọc file X", cái luồng đang chạy đó sẽ đứng hình chờ vài giây cho ổ cứng quay và đọc xong file, rồi mới chạy dòng code tiếp theo. Rất lãng phí tài nguyên!
- Trong Node.js (Cơ chế Non-Blocking): Khi Luồng chính gặp lệnh "Đọc file X", nó không tự tay làm. Nó "ném" mệnh lệnh đó cho Hệ điều hành (hoặc đội luồng C++ của libuv) làm hộ. Ngay lập tức, luồng chính "phủi tay" chạy xuống xử lý dòng code tiếp theo hoặc đi phục vụ request của User khác. Nó **không bao giờ đứng chờ**.

### C. Event-Driven (Hướng sự kiện) & Event Loop (Vòng lặp sự kiện)
Bạn sẽ hỏi: *"Nếu luồng chính không đứng chờ, vậy lúc cái ổ cứng đọc file xong thì ai báo cho nó biết mà lấy dữ liệu ra?"*
Đó là nhiệm vụ của **Event Loop**.
- Khi Hệ điều hành đọc xong file, nó bắn ra một tín hiệu (Sự kiện - Event) kèm theo kết quả.
- Tín hiệu này rớt vào một Hàng đợi (Queue).
- **Event Loop** (một vòng lặp vô tận chìm dưới đáy Node.js) sẽ nhặt cái tín hiệu này lên, và gọi lại cái hàm Javascript của bạn (được gọi là Callback function) để giao trả kết quả cho Luồng chính xử lý tiếp.

## 4. Hành trình của một Request
1. User bấm mua hàng -> Request bay vào Node.js -> Đưa vào Event Queue.
2. Event Loop gắp Request đó đưa cho Main Thread (Luồng chính).
3. Main Thread phân tích giỏ hàng (Logic nhanh) -> Làm ngay lập tức.
4. Tới đoạn cần lấy Thông tin tồn kho từ Database -> Main Thread báo libuv: *"Mày chui xuống DB lấy giùm tao"*. Main Thread quay ra phục vụ User khác.
5. Khi libuv lấy xong Database, báo lại cho Event Loop -> Event Loop vứt lại data cho Main Thread. Main Thread tính toán xong, trả kết quả (Response) về cho trình duyệt.

*(Bạn hãy mở file `event_loop_demo.js` để xem Code mô phỏng tận mắt cách Luồng chính nhảy cóc (Non-Blocking) và cơ chế Event Loop hoạt động như thế nào nhé!)*
