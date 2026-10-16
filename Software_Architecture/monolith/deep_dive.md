# Bản chất bên trong của Monolithic Architecture

> **Ý tưởng chính việc sử dụng:** Đi sâu vào chi tiết kỹ thuật và kiến trúc nội bộ của Monolithic Architecture.
> **Ví dụ:** Phân tích cách code liên kết lỏng (loose coupling) ngay bên trong một codebase nguyên khối để chuẩn bị lên Microservices.


Để hiểu sâu về Monolith, chúng ta cần nhìn vào cách nó hoạt động ở cấp độ hệ điều hành (OS) và môi trường thực thi (Runtime/Web Server).

## 1. Bản chất: Một tiến trình (Single Process) duy nhất
Bất kể ứng dụng của bạn có bao nhiêu chức năng (User, Product, Order, Payment...), khi được khởi chạy, **tất cả đều nằm gọn trong một không gian bộ nhớ (memory space) của một Tiến trình (Process) duy nhất** trên máy chủ (Server).

Điều này mang lại đặc tính gì?
- **Giao tiếp siêu nhanh (In-process communication):** Các module không cần gửi request qua mạng (network/HTTP) để nói chuyện với nhau (như trong Microservices). Module `Order` có thể trực tiếp gọi một hàm (function) hoặc khởi tạo một đối tượng (object) của module `User` trong RAM với độ trễ (latency) gần như bằng 0.
- **Chia sẻ tài nguyên tuyệt đối:** Toàn bộ các module dùng chung RAM, chung CPU, chung các biến toàn cục (global variables) và chung cấu hình kết nối Cơ sở dữ liệu (Connection Pool).

## 2. Monolith điều phối nhiều Request cùng lúc như thế nào?
Bản thân "kiến trúc Monolith" không định nghĩa cách xử lý concurrency (đồng thời). Việc xử lý hàng trăm/ngàn request cùng lúc là do **ngôn ngữ lập trình và Web Server** mà bạn đang sử dụng quyết định.

Có 2 mô hình phổ biến nhất:

### A. Mô hình Đa luồng (Multi-threading) - Ví dụ: Java (Spring Boot), C#, PHP
1. Khi ứng dụng khởi động, Web Server (ví dụ Apache, Tomcat) sẽ tạo ra một **Thread Pool** (hồ chứa luồng) chứa sẵn một lượng Thread (luồng) nhất định (vd: 200 thread).
2. **Request 1** (người dùng A đặt hàng) gửi đến -> Server lấy Thread #1 ra để xử lý đoạn code của module Order.
3. **Request 2** (người dùng B xem sản phẩm) gửi đến cùng lúc -> Server lấy Thread #2 ra để chạy đoạn code của module Product.
4. Hai Thread này chạy đồng thời, cùng truy xuất vào các class, logic dùng chung trong RAM của một Process (chính là ứng dụng Monolith).
5. Xử lý xong, Thread trả kết quả về cho client và quay lại Thread Pool để chờ phục vụ request tiếp theo.
*=> Lưu ý: Vì các module chạy trên các luồng chia sẻ chung 1 vùng nhớ, nếu code không cẩn thận (ví dụ cùng sửa một biến toàn cục), chúng có thể gây ra hiện tượng Race Condition (xung đột dữ liệu).*

### B. Mô hình Đơn luồng Bất đồng bộ (Single-thread Asynchronous) - Ví dụ: Node.js
Trong file `app.js` demo, Node.js mặc định chỉ có **1 luồng chính duy nhất (Main Thread)** chạy code Javascript. Vậy làm sao nó xử lý được nhiều request?
1. Sử dụng cơ chế **Event Loop** (Vòng lặp sự kiện).
2. Khi **Request 1** (mua hàng) đến, luồng chính bắt đầu chạy code tạo Order. Tuy nhiên, nếu gặp tác vụ I/O tốn thời gian (như gọi xuống Database, đọc file, gọi API bên ngoài), luồng chính **không đứng chờ**. Nó giao phó tác vụ đó cho hệ điều hành xử lý ngầm.
3. Ngay lập tức, luồng chính rảnh rỗi và bắt lấy **Request 2** (xem User) để tiếp tục xử lý.
4. Khi Database truy vấn xong cho Request 1, hệ điều hành báo lại cho Event Loop, luồng chính sẽ quay lại để hoàn thành nốt việc gởi kết quả Request 1 về cho trình duyệt.
*=> Toàn bộ request vào các module khác nhau đều "lướt qua lướt lại" và được điều phối nhịp nhàng trên 1 luồng chính duy nhất này, miễn là không có tác vụ nào "ngốn" CPU quá lâu.*

## 3. Rủi ro chí mạng của sự "Dùng chung" trong Monolith
Vì mọi thứ nằm chung một "cái giỏ" (1 Process), nó dẫn đến hiệu ứng dây chuyền khi hệ thống chịu tải cao hoặc có lỗi:

1. **Hiệu ứng Domino (Crash toàn hệ thống):**
   - Giả sử tính năng `Export File Excel` (thuộc module Báo cáo) được lập trình kém, gây rò rỉ bộ nhớ (Memory Leak) hoặc bị tràn bộ nhớ (Out of Memory). Hệ điều hành sẽ tự động "giết" (kill) toàn bộ Process của ứng dụng để giải phóng RAM.
   - Hậu quả: Module `User`, `Order`, `Product` dù code cực kỳ hoàn hảo cũng bị chết theo. Toàn bộ website sập hoàn toàn.
   
2. **Tranh giành tài nguyên (Resource Starvation):**
   - Giả sử hệ thống Monolith mở tối đa 50 kết nối (Connection Pool) tới Database dùng chung cho mọi module.
   - Khi có đợt Flash Sale, lượng người vào xem `Product` và tạo `Order` tăng vọt, chiếm dụng hết 50 connections này.
   - Lúc này, hệ thống nội bộ cần tạo một `User` mới. Request này không có connection nào để xài -> Bị treo và timeout, mặc dù nghiệp vụ User chả liên quan gì đến lượng traffic mua hàng khổng lồ kia.

3. **Nút thắt cổ chai CPU (đặc biệt nguy hiểm trong Node.js):**
   - Nếu module `Image Processing` cần xử lý resize một bức ảnh mất 3 giây bằng CPU, nó sẽ chặn cứng (block) toàn bộ luồng chính trong 3 giây.
   - Trong 3 giây đó, KHÔNG CÓ BẤT KỲ request nào khác (dù là request get User rất nhẹ) được nhận hay phản hồi. Toàn bộ người dùng khác sẽ cảm thấy ứng dụng bị "đơ".
   
*(Trong kiến trúc Microservices, người ta giải quyết các vấn đề này bằng cách tách các module ra thành các ứng dụng nhỏ chạy trên các Process/Server hoàn toàn độc lập)*

## 4. Cách khắc phục nhược điểm "Nút thắt cổ chai CPU" trong Monolith (Đặc biệt với Node.js)
Dù không tách ra thành Microservices, chúng ta vẫn có một số kỹ thuật (workaround) để tránh tình trạng một tác vụ nặng làm "đơ" toàn bộ hệ thống Monolith:

### A. Kỹ thuật Time-sharing (Phân mảnh thời gian)
Thay vì bắt luồng chính xử lý một vòng lặp nặng nề (ví dụ xử lý 1 triệu bản ghi) chạy liên tục một mạch, ta có thể chia nhỏ (chunking) nó ra thành nhiều phần nhỏ.
- **Cách làm:** Xử lý 10.000 bản ghi đầu tiên, sau đó gọi hàm `setImmediate()` (hoặc `setTimeout(..., 0)`). Hàm này có ý nghĩa là: "Tôi tạm nghỉ một chút, đưa quyền điều khiển lại cho Event Loop".
- **Kết quả:** Event Loop chớp lấy cơ hội này để tranh thủ đi phản hồi các HTTP Request khác của người dùng đang bị nghẽn. Giải quyết xong các request đó, Event Loop mới quay lại chạy tiếp 10.000 bản ghi tiếp theo của tác vụ nặng kia.
*=> Ưu điểm: Giữ cho ứng dụng luôn phản hồi. Nhược điểm: Code phức tạp lên khá nhiều và thời gian để xử lý xong tác vụ nặng bị kéo dài ra.*

### B. Ủy thác cho Luồng phụ (Worker Threads)
Tách hoàn toàn phần việc nặng ra khỏi Luồng chính (Main Thread).
- **Cách làm:** Node.js hỗ trợ module `worker_threads`. Khi có một request yêu cầu mã hóa mật khẩu cực mạnh (bcrypt) hay xử lý ảnh, luồng chính sẽ tạo ra một Worker (luồng phụ chạy trên một nhân CPU khác) và ném công việc sang đó.
- **Kết quả:** Luồng chính ngay lập tức rảnh tay để đón user khác. Khi nào Worker làm xong, nó sẽ bắn "tín hiệu" (event) trả kết quả về cho luồng chính.
*=> Đây là cách trị dứt điểm tắc nghẽn luồng chính. Tuy nhiên, nó vẫn làm hao tổn tổng tài nguyên CPU của cả cái Server Monolith đó.*

### C. Nhân bản Process (Cluster Mode)
Khai thác sức mạnh của hệ thống đa nhân (Multi-core) bằng cách nhân bản cục Monolith thành nhiều bản sao.
- **Cách làm:** Sử dụng module `cluster` có sẵn của Node.js hoặc dùng công cụ như **PM2**. Nếu máy chủ của bạn có 4 nhân CPU (4 cores), PM2 sẽ khởi chạy 4 Tiến trình (Process) Monolith song song. Phía trước có một Load Balancer tự động chia đều request cho 4 Process này.
- **Kết quả:** Nếu lỡ xui xẻo Process #1 bị khóa cứng (block) bởi một task xử lý ảnh ngốn CPU, thì 3 Process còn lại vẫn đang rảnh rỗi và tiếp tục phục vụ người dùng bình thường.
*=> Đây là phương pháp phổ biến và bắt buộc phải dùng khi triển khai (deploy) ứng dụng Monolith Node.js thực tế (production).*

## 5. Chuyên sâu về PM2: Trợ thủ đắc lực cho Monolith Node.js
**PM2 (Process Manager 2)** là một công cụ quản lý tiến trình cực kỳ mạnh mẽ. Trong kiến trúc Monolith, PM2 giống như một "người quản gia" bảo vệ và tối ưu hóa toàn bộ hệ thống của bạn.

### PM2 dùng để làm gì?
1. **Giữ cho ứng dụng luôn sống (Keep-alive/Auto-restart):** Trong Monolith, chỉ cần một module nhỏ bị lỗi (như gọi hàm của một biến `undefined`), toàn bộ tiến trình sẽ văng lỗi và sập. PM2 sẽ liên tục theo dõi (monitor), nếu phát hiện ứng dụng sập, nó sẽ khởi động lại (restart) ngay lập tức trong vài mili-giây, giúp website của bạn "bất tử".
2. **Kích hoạt Cluster Mode mà không cần sửa code:** Thay vì phải tự viết code phức tạp bằng module `cluster`, bạn chỉ cần gõ lệnh `pm2 start app.js -i max`. Lập tức PM2 sẽ đếm xem máy chủ có bao nhiêu nhân CPU, và nó sẽ "nhân bản" ứng dụng Monolith của bạn ra bấy nhiêu bản (Ví dụ máy 4 nhân -> Chạy 4 app song song). Nó cũng tích hợp luôn một bộ Cân bằng tải (Load Balancer) ngầm để chia đều lượng truy cập vào 4 app này. Rất thần kỳ!
3. **Cập nhật không gián đoạn (Zero-downtime Reload):** Khi bạn cập nhật code mới, bình thường bạn phải tắt app cũ (làm mất kết nối người dùng) rồi bật app mới. Lệnh `pm2 reload` sẽ giải quyết chuyện này bằng cách: Khởi động dần dần từng app mới lên, và từ từ tắt từng app cũ đi. Hệ thống luôn có ít nhất 1 app hoạt động, người dùng không hề hay biết website vừa được nâng cấp.
4. **Quản lý giới hạn bộ nhớ (Memory Limit):** Vì tất cả module chạy chung, rò rỉ bộ nhớ (memory leak) rất dễ xảy ra. PM2 cho phép cài đặt: "Nếu ứng dụng này phình to quá 1GB RAM, hãy tự động restart nó để giải phóng bộ nhớ".
5. **Gom Log tập trung:** PM2 thu thập toàn bộ console.log, console.error từ mọi ngóc ngách của các module vào chung một nơi để dễ dàng tra cứu.

*(Xem file `ecosystem.config.js` để thấy cấu hình PM2 thực tế và `worker_demo.js` để xem cách tách luồng phụ trong Node.js)*
