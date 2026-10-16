# Inbox Pattern (Mẫu hộp thư đến)

> **Ý tưởng chính việc sử dụng:** Bảo vệ ứng dụng khỏi lỗi 'Broker gửi trùng 1 Event nhiều lần'. Ta lưu Event ID vào Database để kiểm tra (Tính Lũy đẳng).
> **Ví dụ:** Khi Kafka gửi event 'ThanhToan', ta lưu ID vào bảng Inbox. Nếu Kafka lác mạng gửi lại đúng ID đó, DB sẽ chặn đứng và không bị trừ tiền khách 2 lần.


Nếu **Outbox Pattern** là vũ khí bảo vệ người gửi (Publisher) khỏi mất tin nhắn, thì **Inbox Pattern** là khiên chắn bảo vệ người nhận (Subscriber) khỏi việc **nhận trùng một tin nhắn nhiều lần**.

Hai pattern này LUÔN ĐI CẶP với nhau để tạo ra trải nghiệm "Exactly-once Processing" (Xử lý chuẩn xác đúng 1 lần) trong môi trường Distributed System cực kỳ rủi ro.

## 1. Mức Độ Cơ Bản (Basic)

### Vấn đề: Trùng lặp tin nhắn (Duplicate Message)
Hầu hết các Message Broker phổ biến (Kafka, RabbitMQ, SQS) đều vận hành theo cơ chế **"At-least-once" (Ít nhất một lần giao)**. 
- Nghĩa là: Broker hứa với bạn là nó chắc chắn sẽ gửi thư tới tận tay bạn. Nhưng đổi lại, thỉnh thoảng mạng bị lác, nó sợ bạn chưa nhận được nên nó sẽ gửi lá thư đó thêm lần 2, lần 3!
- Hậu quả: Bạn nhận được Event `OrderCreated: { id: "O_123" }` hai lần. Bạn vô tư trừ tiền khách 2 lần. Khách hàng phốt công ty lên mạng xã hội.

### Giải pháp: Inbox Pattern
Thay vì bay vào trừ tiền ngay lập tức khi nhận tin, bạn phải làm thêm 1 bước bảo vệ:
1. Bạn tạo một bảng Database nội bộ tên là `Inbox`.
2. Khi nhận Event, bạn lấy cái `EventID` lưu vào bảng `Inbox`. (Cột `EventID` được set thuộc tính Unique / Khóa chính).
3. Nếu Database báo lỗi "Duplicate Key" (Trùng khóa) -> A ha! Thằng Broker lại gửi tin rác. Bạn phớt lờ nó, `return OK`.
4. Nếu Database lưu thành công, đây là tin nhắn tươi mới. Bạn bắt đầu lấy tiền khách hàng. Xử lý xong, update trạng thái Inbox thành "PROCESSED".

## 2. Mức Độ Trung Bình (Intermediate): Under the Hood

### Idempotent Receiver (Người nhận Lũy đẳng)
Kỹ thuật dùng bảng Inbox chính là cách hoàn hảo nhất để tạo ra một con **Idempotent Receiver**.
Idempotency (Tính Lũy đẳng) nghĩa là: Hàm `(x)` chạy 1 lần hay 100 lần thì kết quả cũng y hệt như chạy 1 lần.
Bạn có thể bị nã hàng trăm request báo "Đơn O_123 đã thanh toán", nhưng bảng Inbox sẽ chặn đứng ngay lập tức tại cánh cửa Database.

### Quản lý Transaction của Inbox
Quan trọng: Việc kiểm tra Inbox và xử lý nghiệp vụ phải ĐỒNG BỘ với nhau (Cùng chung 1 Transaction SQL).
Nếu bạn kiểm tra Inbox xong, trừ tiền thành công, nhưng cúp điện chưa kịp đổi trạng thái Inbox -> Lần sau xử lý trùng!
Quy trình đúng: `BEGIN TRAN` -> `INSERT Inbox` -> `UPDATE User Balance` -> `COMMIT TRAN`.

## 3. Mức Độ Nâng Cao (Advanced)

### Dọn dẹp Inbox (Garbage Collection)
Bảng Inbox sẽ phình to ra theo thời gian (Hàng triệu dòng mỗi ngày).
Bạn cần có một Cronjob hoặc TTL (Time-To-Live) để tự động xóa các record Inbox đã quá hạn (VD: Xóa các record đã tạo cách đây 7 ngày). Vì Message Broker thường cũng chỉ rớt mạng và gửi trùng trong khoảng vài ngày đổ lại mà thôi.

### Tích hợp với Event Sourcing
Nếu bạn dùng Event Sourcing, bạn không cần bảng Inbox rời!
Bản thân chuỗi Event của Aggregrate chính là một cái Inbox tự nhiên. Bạn chỉ cần gán cái `EventID` của hệ thống ngoài làm `EventID` nội bộ. Cơ sở dữ liệu sẽ tự chặn trùng mã bằng Unique Constraint.

## 4. So Sánh (Compare & Contrast)

| Pattern | Vai trò | Trách nhiệm | Chống lỗi gì? |
| :--- | :--- | :--- | :--- |
| **Outbox** | Ở phía người Gửi (Publisher) | Đảm bảo ném thư vào hòm thư thành công. | Mất dữ liệu (Data Loss) do rớt mạng Broker. |
| **Inbox** | Ở phía người Nhận (Subscriber)| Lọc thư rác. | Trùng lặp dữ liệu (Duplication) do Broker gửi 2 lần. |
| **Saga** | Trải dài toàn quy trình | Đền bù khi có lỗi logic. | Giao dịch treo lơ lửng không thống nhất. |

## 5. Bài Tập Thực Hành Nhỏ

**Tình huống**: Trong file `demo-inbox.ts`, một Consumer của Kafka nhận event `DeductMoney` để trừ tiền khách. Nhưng Kafka bị chập chờn, vô tình gửi tin nhắn `DeductMoney` đó tới tận 2 lần (Cùng 1 cái EventID). Hệ thống hiện tại quá ngây thơ, đã trừ tiền khách 2 lần.

*Nhiệm vụ*: Áp dụng Inbox Pattern.
1. Tạo mảng (Bảng) `InboxDB` chứa danh sách các `EventID` đã xử lý.
2. Sửa lại code Consumer: Kiểm tra xem EventID đã tồn tại trong Inbox chưa. Nếu có rồi thì chửi Kafka và bỏ qua. Nếu chưa thì mới trừ tiền và lưu ID vào Inbox.

Code đề bài và đáp án nằm tại: [answers-inbox](/Users/ductri0981/Documents/Studying-Software/inbox_pattern/answers-inbox.ts)

## 6. Phụ Lục (Sơ Đồ Kiến Trúc)

```mermaid
flowchart LR
    Kafka(("Message Broker (Gửi tin trùng lặp)"))
    
    subgraph Microservice_Nhan ["Microservice Nhận (Payment)"]
        direction TB
        Receiver("Consumer / Subscriber")
        
        subgraph SQL ["SQL Database"]
            TblInbox[("Bảng INBOX")]
            TblBal[("Bảng Balance")]
        end
        
        Receiver -- "1. INSERT EventID" --> TblInbox
        TblInbox -. "Duplicate Error" .-> Receiver
        TblInbox -- "OK (Tin mới)" --> TblBal
        
        %% Nếu OK mới chạy xuống
        Receiver -- "2. Trừ Tiền" --> TblBal
    end
    
    Kafka -- "Event("id: 99")\nEvent("id: 99")" --> Receiver
```

## 7. Giải Thích Thuật Ngữ (Glossary)
- **Inbox**: Hộp thư đến. Bảng ghi log các ID sự kiện đã nhận để phòng chống xử lý lặp.
- **Idempotency (Tính Lũy đẳng)**: f(f(x)) = f(x). Nhận 1 tin trùng lập sẽ không làm biến đổi sai lệch dữ liệu nội tại.
- **At-least-once (Ít nhất 1 lần)**: Chính sách gửi tin của các Broker. Hứa không rớt tin, nhưng không hứa là không gửi trùng.
- **Exactly-once (Đúng 1 lần)**: Khát vọng tối cao của mọi hệ thống phân tán. Đạt được nhờ sự kết hợp của Outbox (Chiều đi) + Inbox (Chiều tới).
- **TTL (Time to Live)**: Thời gian sống. Kỹ thuật tự động xóa dữ liệu rác sau một khoảng thời gian nhất định để giải phóng dung lượng DB.
