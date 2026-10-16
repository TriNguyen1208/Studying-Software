# Modular Monolith - Chẻ Nhỏ Gã Khổng Lồ

> **Ý tưởng chính việc sử dụng:** Nguyên khối nhưng được chia thành các module độc lập. Giải quyết nhược điểm spaghetti code của Monolith mà chưa cần phức tạp như Microservices.
> **Ví dụ:** Tạo các thư mục User, Order riêng biệt, không gọi thẳng DB của nhau mà gọi qua Interface.


## 1. Mức Độ Cơ Bản (Basic)

### Modular Monolith là gì?
Hãy tưởng tượng bạn đang xây một tòa nhà.
- **Monolith truyền thống (Spaghetti Code / Big Ball of Mud)**: Giống như một cái nhà kho khổng lồ không có vách ngăn. Bếp, phòng ngủ, nhà vệ sinh trộn lẫn vào nhau. Một người làm đổ nước ở bếp có thể chảy lan sang giường ngủ. (Các tính năng gọi chéo nhau lung tung, đụng vào đâu cũng sợ hỏng chỗ khác).
- **Microservices**: Giống như bạn xây 3 căn nhà riêng biệt: 1 nhà chỉ để ngủ, 1 nhà chỉ để nấu ăn, 1 nhà chỉ để tắm. Nếu muốn đi từ phòng ngủ sang bếp, bạn phải đi ra ngoài đường (gọi qua mạng - Network Call). Nó an toàn, tách biệt, nhưng rất tốn kém và phức tạp để quản lý (phải xây 3 móng nhà, đường đi, v.v.).
- **Modular Monolith**: Giống như một **căn hộ chung cư cao cấp**. Nó vẫn nằm trong **một tòa nhà duy nhất** (1 cục code, 1 lần deploy duy nhất), nhưng bên trong được chia thành các **phòng riêng biệt có tường cách âm** (Modules). Bạn không thể đi xuyên tường, mà phải gõ cửa hoặc đi qua hành lang chung (API nội bộ / Event Bus).

### Vấn đề cốt lõi mà Modular Monolith giải quyết
Modular Monolith giải quyết bài toán: **Làm sao để code gọn gàng, độc lập, dễ bảo trì như Microservices, nhưng lại dễ triển khai và không bị độ trễ mạng (network latency) như Monolith truyền thống?**

---

## 2. Mức Độ Trung Bình (Intermediate)

### Cách thức hoạt động dưới nền tảng (Under the hood)
Trong một Modular Monolith, code được chia thành các "Module" (ví dụ: `UserModule`, `OrderModule`, `InventoryModule`). 
Các nguyên tắc vàng:
1. **Ranh giới nghiêm ngặt (Strict Boundaries)**: `OrderModule` **KHÔNG BAO GIỜ** được phép gọi trực tiếp vào database của `UserModule`.
2. **Giao tiếp qua Interface / Event**: Nếu `OrderModule` muốn biết thông tin User, nó phải gọi một hàm (API) công khai do `UserModule` cung cấp, hoặc lắng nghe một sự kiện (Event) do `UserModule` phát ra.
3. **Một ứng dụng duy nhất**: Khi chạy code, tất cả các module này chạy chung trên một process Node.js, chung một RAM. Khi deploy, bạn chỉ cần gõ `npm start` một lần.

### Khi nào nên dùng? (Use Cases)
- **Rất nên dùng**: Hầu hết các dự án startup, dự án vừa và lớn. Nó là kiến trúc tuyệt vời để bắt đầu. Khi dự án quá lớn, bạn có thể dễ dàng cắt một Module ra thành Microservice sau này.
- **Không nên dùng**: Khi bạn có yêu cầu mở rộng (scale) cực kỳ dị biệt. Ví dụ: Module "Tạo PDF" cần quá nhiều CPU, trong khi Module "Đọc dữ liệu" chỉ cần RAM. Khi đó bạn cần tách Module "Tạo PDF" thành Microservice để chạy trên một máy chủ mạnh hơn.

---

## 3. Mức Độ Nâng Cao (Advanced)

### Rủi ro và Sai lầm thường gặp (Anti-patterns)
- **Leaky Database (Rò rỉ Database)**: Sai lầm chí mạng nhất là các module dùng chung các bảng trong Database và Join chúng với nhau. Một Modular Monolith "chuẩn" yêu cầu mỗi Module phải có Schema DB riêng, hoặc chí ít là không bao giờ Join bảng của Module này với Module khác.
- **Coupling qua Data Types**: Module A trả về đối tượng `Order`, Module B lấy luôn object `Order` đó để dùng. Nếu Module A đổi cấu trúc `Order`, Module B sẽ lỗi. Cần có lớp DTO (Data Transfer Object) để chuẩn hóa dữ liệu giao tiếp.

### Event-Driven Communication
Để giảm sự phụ thuộc, các module thường dùng một **In-memory Event Bus** (như `EventEmitter` trong Node.js). 
Thay vì `OrderModule` gọi trực tiếp `InventoryModule.reduceStock()`, thì `OrderModule` chỉ cần hét lên: *"Ê, có người vừa mua hàng xong nhé (OrderCreatedEvent)!"*. 
`InventoryModule` tự nghe thấy và tự trừ kho. Hai thằng không hề biết mặt nhau (Decoupled).

### Khi nào gọi hàm trực tiếp vs Khi nào dùng Sự kiện?
Trong giao tiếp giữa các module, quyết định giữa việc gọi hàm trực tiếp (Synchronous Call) và sử dụng sự kiện (Asynchronous Event-driven) thường dựa trên **sự kết dính (coupling)**, **tính nhất quán của dữ liệu (data consistency)**, và **luồng nghiệp vụ (business flow)**.

#### 1. Khi nào nên gọi hàm trực tiếp (Public API)
*   **Cần kết quả ngay lập tức để xử lý tiếp:** Module A không thể hoàn thành logic của nó nếu không có dữ liệu từ Module B. Ví dụ: Module `Order` cần gọi Module `Inventory` để kiểm tra tồn kho **trước khi** cho phép tạo đơn hàng.
*   **Query dữ liệu (Đọc):** Khi chỉ cần lấy thông tin từ một module khác để hiển thị hoặc tính toán. Việc phát event để lấy dữ liệu thường rất phức tạp và không cần thiết.
*   **Nghiệp vụ cốt lõi (Core Business) yêu cầu tính nhất quán tức thì (Strong Consistency):** Nếu quy trình A và B phải cùng thành công hoặc cùng thất bại (Transactional).

#### 2. Khi nào nên dùng Sự kiện (Events)
*   **Fire and Forget (Làm xong rồi thôi):** Module A không cần kết quả trả về từ Module B để hoàn thành flow của nó. Ví dụ: Tạo đơn hàng thành công, gửi event để gửi email xác nhận.
*   **Quy trình nghiệp vụ kéo dài (Long-running processes / Sagas):** Các quy trình tốn thời gian hoặc liên quan đến third-party chậm (ví dụ thanh toán cổng bên thứ ba).
*   **Nhiều module cùng quan tâm đến một sự kiện (1-to-N):** Nếu dùng hàm gọi trực tiếp, Module A sẽ phải gọi hàm của Module B, C, D... Dẫn đến tightly coupled. Dùng event giúp cách ly.
*   **Tính nhất quán cuối cùng (Eventual Consistency):** Khi nghiệp vụ cho phép độ trễ nhỏ trong việc đồng bộ dữ liệu.

**Quy tắc ngón tay cái:**
* *"Tôi có thể hoàn thành việc của mình nếu không có dữ liệu này không?"* -> **KHÔNG** -> Gọi API.
* *"Tôi làm xong việc chính rồi, ai làm gì tiếp theo thì làm, tôi không quan tâm."* -> Dùng Event.

---

## 4. Phụ Lục (Biểu đồ so sánh)

```mermaid
graph TD
    subgraph Monolith Truyền Thống
        A1["Code rối rắm"] --- B1["Code rối rắm"]
        B1 --- C1["Code rối rắm"]
        C1 --- A1
    end

    subgraph Microservices
        A2["User Service"] -.Network.-> B2["Order Service"]
        B2 -.Network.-> C2["Inventory Service"]
    end

    subgraph Modular Monolith
        A3["User Module"] -->|"Internal API / Event Bus"| B3["Order Module"]
        B3 -->|"Internal API / Event Bus"| C3["Inventory Module"]
    end

    style Monolith Truyền Thống fill:#f9f,stroke:#333,stroke-width:2px
    style Microservices fill:#bbf,stroke:#333,stroke-width:2px
    style Modular Monolith fill:#bfb,stroke:#333,stroke-width:2px
```

## 5. Bài Tập Thực Hành
Bạn hãy mở file `app.js` trong cùng thư mục này ra xem. Sau khi hiểu luồng code, hãy thử làm bài tập sau:
**Thử thách**: Hãy viết thêm một `NotificationModule`. Module này sẽ lắng nghe sự kiện `ORDER_CREATED` và in ra màn hình dòng chữ: `[NotificationModule] Đã gửi email xác nhận đơn hàng cho User [ID]`.
