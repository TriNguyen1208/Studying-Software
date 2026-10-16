# Outbox Pattern (Mẫu hộp thư đi)

> **Ý tưởng chính việc sử dụng:** Bảo vệ hệ thống khỏi lỗi 'Lưu Database xong rớt mạng không bắn được Event'. Ta lưu Event vào Database chung 1 giao dịch SQL, rồi từ từ chuyển đi sau.
> **Ví dụ:** Lưu Đơn Hàng mới và lưu sự kiện 'OrderCreated' vào bảng Outbox cùng 1 lúc. Một Worker chạy ngầm đọc Outbox và bắn lên Kafka.


Đây là mẫu thiết kế sống còn trong Microservices sử dụng **Event-Driven Architecture**. Bất cứ ai làm Event-driven mà không dùng Outbox đều sẽ gặp lỗi mất dữ liệu khi mạng chập chờn.

## 1. Mức Độ Cơ Bản (Basic)

### Vấn đề: Dual Write (Ghi song song)
Khi User đăng ký thành công, bạn cần làm 2 việc:
1. Lưu User đó vào Database SQL (`INSERT INTO Users`).
2. Gửi một tin nhắn vào Kafka (`UserCreated`) để gửi Email chào mừng.

Bạn sẽ viết code theo thứ tự nào?
- Lưu DB trước rồi bắn Kafka? Nếu Lưu DB thành công, nhưng dây cáp mạng tới Kafka bị đứt? User được tạo nhưng không có Email chào mừng! Dữ liệu bị rách (Inconsistent).
- Bắn Kafka trước rồi lưu DB? Nếu Kafka nhận được tin, gửi mail xong. Nhưng Lưu DB bị lỗi rớt mạng. Người lạ nhận được Email chào mừng nhưng không login được!

Bạn không thể dùng Transaction cho cả hai, vì DB và Kafka là 2 công nghệ độc lập.

### Giải pháp: Outbox Pattern
Ta tận dụng sức mạnh của SQL Transaction. Trong cùng 1 khối Transaction, ta làm 2 việc:
1. `INSERT INTO Users (name) VALUES ('Bob')`
2. `INSERT INTO Outbox (event, payload) VALUES ('UserCreated', '{"name":"Bob"}')`

Lưu ý: Bảng `Outbox` nằm CHUNG trong cái SQL Database đó luôn! Nên nếu giao dịch thành công, chắc chắn có dữ liệu ở cả 2 bảng. Không sợ rớt mạng.

Sau đó, ta tạo một con **Worker chạy ngầm** (Background Job). Nó cứ lững thững đi đọc bảng Outbox, thấy có tin nào thì nó lấy gửi qua Kafka. Gửi xong thì xóa đi (hoặc đánh dấu là Done).

## 2. Mức Độ Trung Bình (Intermediate): Under the Hood

### Cấu trúc bảng Outbox
Một bảng Outbox cơ bản cần các cột:
- `id` (UUID)
- `aggregate_type` (VD: 'User')
- `aggregate_id` (VD: 'U123')
- `type` (VD: 'UserCreated')
- `payload` (Chuỗi JSON chứa data)
- `status` (PENDING, PROCESSED) hoặc `created_at`

### Cơ chế Polling (Quét định kỳ)
Thường người ta viết một cái Cronjob cứ 2 giây chạy vòng lặp `SELECT * FROM Outbox WHERE status = 'PENDING'`. 
Cách này dễ code, nhưng nếu hệ thống quá lớn, cứ 2 giây quét DB liên tục sẽ làm nghẽn DB.

## 3. Mức Độ Nâng Cao (Advanced)

### Transaction Log Tailing (CDC - Change Data Capture)
Thay vì code vòng lặp `SELECT` liên tục vào DB, ta xài công cụ xịn hơn là **Debezium**.
Các Database SQL (như Postgres, MySQL) mỗi lần có lệnh INSERT, nó đều ngầm lưu vào một file gọi là **Transaction Log (WAL - Write-Ahead Log)**.
Debezium sẽ đóng vai trò như một con đỉa, bám vào cái file log này. Hễ thấy DB ghi vào bảng Outbox, nó bắt ngay lập tức đoạn text đó và tự động tuồn thẳng sang Kafka siêu tốc, không cần truy vấn DB, độ trễ bằng 0, không gây áp lực cho DB.

### Eventual Delivery (Đảm bảo Giao Hàng)
Với Outbox Pattern, bạn được đảm bảo "At-least-once" (Ít nhất một lần giao tin). 
Nếu Worker gửi tin qua Kafka xong, nhưng chưa kịp `UPDATE status = 'PROCESSED'` thì bị cúp điện. Lần sau mở máy, nó sẽ gửi tin đó thêm lần 2. (Gửi trùng lặp).
Do đó, Hệ thống nào nghe (Consumer) bắt buộc phải code **Inbox Pattern** (Idempotency) để ngừa tin trùng.

## 4. So Sánh (Compare & Contrast)

| Đặc điểm | Dual Write (Ghi DB + Gửi API Broker) | Outbox Pattern (Ghi DB + Ghi Outbox) |
| :--- | :--- | :--- |
| **Tính an toàn** | Hên xui. Mạng lag là mất thông báo vĩnh viễn. | An toàn tuyệt đối (Bảo vệ bằng ACID Transaction). |
| **Tốc độ phản hồi UI**| Có thể bị chậm do chờ API của Broker phản hồi. | Siêu nhanh (Ghi DB nội bộ xong là báo Client ngay). |
| **Khả năng gửi trùng** | Rất khó xảy ra. | Rất hay xảy ra (Do worker chạy ngầm). Cần Inbox Pattern hỗ trợ. |

## 5. Bài Tập Thực Hành Nhỏ

**Tình huống**: Trong file `demo-outbox.ts`, một `OrderService` đang sử dụng Dual Write. Nó lưu đơn hàng vào DB, rồi cố gắng bắn ngay sự kiện ra Kafka. Nếu mạng Kafka chập chờn, đơn hàng được tạo nhưng hệ thống nhà bếp không bao giờ nhận được thông báo để nấu món!

*Nhiệm vụ*: Áp dụng Outbox Pattern.
1. Trong hàm xử lý, chỉ lưu DB `Order` và DB `Outbox` (Mô phỏng chung 1 mảng/Transaction).
2. Viết một hàm Worker mô phỏng chạy bằng `setInterval`, móc trong Outbox ra gửi đi, gửi xong thì cắt bỏ khỏi Outbox.

Code đề bài và đáp án nằm tại: [answers-outbox](/Users/ductri0981/Documents/Studying-Software/outbox_pattern/answers-outbox.ts)

## 6. Phụ Lục (Sơ Đồ Kiến Trúc)

```mermaid
flowchart TD
    subgraph Microservice1 ["Microservice Bán Hàng"]
        direction TB
        App("Logic Ứng Dụng")
        
        subgraph SQL_DB ["SQL Database (Cùng Transaction)"]
            Tbl1[("Bảng Order")]
            Tbl2[("Bảng Outbox")]
        end
        
        Worker(["Worker Chạy Ngầm / CDC Debezium"])
        
        App -- "1. INSERT" --> Tbl1
        App -- "2. INSERT Event" --> Tbl2
        
        Tbl2 -- "3. Quét định kỳ (Polling)" --> Worker
    end
    
    Kafka("('Message Broker
    (Kafka'")))
    
    Worker -- "4. Gửi Event" --> Kafka
    Worker -. "5. Xóa khỏi DB" .-> Tbl2
```

## 7. Giải Thích Thuật Ngữ (Glossary)
- **Outbox**: Hộp thư đi. Bảng CSDL lưu trữ tạm các tin nhắn cần gửi ra mạng.
- **Dual Write (Ghi kép)**: Anti-pattern phổ biến. Cố gắng thay đổi dữ liệu ở 2 hệ thống khác biệt trong cùng một thao tác thời gian thực mà không có Transaction hỗ trợ.
- **Message Relay (Rơ-le chuyển tiếp)**: Con Worker có nhiệm vụ đọc Outbox và chuyển qua Broker.
- **CDC (Change Data Capture)**: Kỹ thuật bắt các sự thay đổi ở Database trực tiếp thông qua Transaction Log của DB, thay vì dùng câu lệnh SELECT liên tục.
