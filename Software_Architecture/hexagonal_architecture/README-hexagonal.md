# Hexagonal Architecture (Kiến trúc Lục giác / Ports and Adapters)

> **Ý tưởng chính việc sử dụng:** Tách biệt Lõi nghiệp vụ (Domain) hoàn toàn khỏi các chi tiết công nghệ (DB, UI, API) bằng cách sử dụng Ports (Cổng) và Adapters (Đầu chuyển).
> **Ví dụ:** Domain định nghĩa một Interface Port (IUserRepository). Logic thao tác MySQL sẽ nằm ở Adapter, cắm vào Port này. Domain không hề biết MySQL là gì.


Khi một ứng dụng phát triển, mã nguồn thường trở thành một mớ hỗn độn (Spaghetti code) nơi logic nghiệp vụ (Business Logic) bị dính chặt với các công nghệ bên ngoài như Database (SQL/NoSQL), Framework (Express/Nest), hoặc các API bên thứ 3. Hexagonal Architecture được sinh ra để giải quyết triệt để vấn đề này.

## 1. Mức Độ Cơ Bản (Basic)

### Hexagonal Architecture là gì?
Kiến trúc Lục giác, hay tên gốc là **Ports and Adapters** (Cổng và Bộ chuyển đổi), là một mẫu thiết kế phần mềm chia ứng dụng thành các phần tách biệt độc lập. Trong đó:
- **Phần Lõi (Core/Domain)**: Nơi chứa toàn bộ luật lệ kinh doanh của ứng dụng. Phần lõi này hoàn toàn "mù", nó KHÔNG biết bạn đang dùng Database gì, KHÔNG biết ứng dụng là Web hay Mobile.
- **Thế giới bên ngoài**: Bao gồm Giao diện người dùng (UI/API), Cơ sở dữ liệu (Database), Hệ thống gửi Email, v.v.

### Vấn đề cốt lõi giải quyết
Hãy tưởng tượng bạn đổi từ việc lưu dữ liệu bằng MongoDB sang PostgreSQL, hoặc đổi từ việc gọi qua REST API sang dùng gRPC. Ở các hệ thống cũ, bạn phải đập đi viết lại phần lớn logic ứng dụng. Với Hexagonal, bạn CHỈ CẦN rút rắc cắm (Adapter) cũ ra, và cắm rắc cắm mới vào, phần Lõi (Core) không phải sửa lấy một dòng code.

## 2. Mức Độ Trung Bình (Intermediate): Under the Hood

Kiến trúc này xoay quanh 2 khái niệm chính: **Ports** và **Adapters**.

1. **Ports (Cổng)**: Là các Bản hợp đồng (Interface). Nó định nghĩa cách phần Lõi muốn giao tiếp. Có 2 loại:
   - **Driving Ports (Cổng vào / Primary)**: Giao diện mà phần Lõi cung cấp cho thế giới bên ngoài (VD: Interface `TaoDonHangUseCase`). Bọn bên ngoài (như Web Controller) bắt buộc phải tuân theo cổng này để yêu cầu lõi làm việc.
   - **Driven Ports (Cổng ra / Secondary)**: Giao diện mà phần Lõi yêu cầu thế giới bên ngoài phải có để lõi xài (VD: Interface `LưuDonHangRepository`). Lõi chỉ cần biết có hàm `luu()`, còn lưu vào đâu Lõi không quan tâm.

2. **Adapters (Bộ chuyển đổi)**: Là phần thực thi (Implementation) cụ thể của các Port.
   - **Driving Adapters (Primary)**: Ví dụ như `ExpressController`, `GraphQLResolver`. Nó chuyển đổi HTTP Request thành một lời gọi hàm gửi qua *Driving Port* vào Lõi.
   - **Driven Adapters (Secondary)**: Ví dụ như `MySQLRepository`, `RedisCache`, `S3FileUploader`. Nó triển khai *Driven Port*, làm nhiệm vụ chuyển đổi yêu cầu từ Lõi thành ngôn ngữ của SQL hoặc API của AWS.

*Use Cases*: Rất thích hợp cho các ứng dụng có vòng đời dài (long-lasting), logic phức tạp (Domain-Driven Design), hoặc khi có khả năng cao sẽ phải thay đổi công nghệ bên ngoài (như đổi nhà cung cấp Cloud). Không nên dùng cho các ứng dụng CRUD quá đơn giản, vòng đời ngắn, vì nó sẽ gây ra sự cồng kềnh (over-engineering) không cần thiết.

## 3. Mức Độ Nâng Cao (Advanced)

### Nguyên lý Đảo ngược Phụ thuộc (Dependency Inversion Principle - DIP)
Đây là phép màu của Hexagonal. Trong kiến trúc 3 lớp cũ (Layered), Lớp Business Logic phụ thuộc trực tiếp vào Lớp Database. 
Trong Hexagonal, Lớp Business Logic định nghĩa ra cái Port (Interface). Lúc này Lớp Database (Adapter) phải *implement* cái Port đó. Tức là chiều phụ thuộc đã bị **ĐẢO NGƯỢC**: Database giờ đây phải phụ thuộc vào luật lệ của Business Logic!

### Anti-patterns (Sai lầm phổ biến) & Rủi ro
1. **Rò rỉ Domain (Domain Leakage)**: Adapter trả về trực tiếp các Object của ORM (như Mongoose Document hay TypeORM Entity) cho phần Lõi. *Giải pháp*: Adapter phải map (chuyển đổi) dữ liệu của Database thành đối tượng Domain thuần túy (Pure Object) trước khi trả cho Lõi.
2. **Logic kinh doanh rò rỉ vào Adapter**: Viết code tính toán giá tiền, kiểm tra quyền hạn ngay trong SQL Query hoặc bên trong Web Controller. *Giải pháp*: Mọi quyết định kinh doanh phải nằm trong Lõi (Use Case / Domain Entity).

## 4. So Sánh (Compare & Contrast)

| Đặc điểm | Layered Architecture (N-Tier / MVC) | Hexagonal Architecture (Ports & Adapters) | Clean Architecture |
| :--- | :--- | :--- | :--- |
| **Cấu trúc** | Phân theo lớp từ trên xuống: Presentation -> Logic -> Data. | Phân theo Trong (Lõi) và Ngoài (Adapters). Có dạng hình lục giác. | Tương tự Hexagonal nhưng chia làm nhiều vòng tròn đồng tâm chặt chẽ hơn (Entities -> Use Cases -> Controllers -> DB). |
| **Sự phụ thuộc** | Lớp trên phụ thuộc lớp dưới. Logic bị kẹt với DB. | Bên ngoài phụ thuộc vào bên trong. Lõi hoàn toàn độc lập. | Bên ngoài phụ thuộc vào bên trong. |
| **Testing** | Cực khó test riêng lẻ Logic, thường phải mock nguyên cái Database. | Rất dễ test. Chỉ cần tạo Fake/Mock Adapter cắm vào các Port. | Rất dễ test. |

## 5. Bài Tập Thực Hành Nhỏ

**Tình huống**: Trong file code demo bên dưới, ứng dụng đang dùng một Database lưu trong bộ nhớ tạm (In-Memory Database). Hệ thống yêu cầu chúng ta phải chuyển sang lưu dữ liệu dưới dạng File JSON trên ổ cứng, nhưng **TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA** bất kỳ dòng code nào trong phần Lõi (Core/Domain).

*Nhiệm vụ*: Hãy viết một *Secondary Adapter* mới (File JSON Repository) và thực hiện Dependency Injection (cắm rắc) nó vào hệ thống thay cho Adapter cũ.

Code đáp án nằm tại: [answers-hexagonal](/Users/ductri0981/Documents/Studying-Software/hexagonal_architecture/answers-hexagonal.ts)

## 6. Phụ Lục (Sơ Đồ Kiến Trúc)

```mermaid
flowchart LR
    subgraph PrimaryAdapters ["Driving Adapters (Giao tiếp Đầu vào)"]
        Web["Web/REST API"]
        CLI["Command Line CLI"]
        Test["Unit Tests"]
    end

    subgraph HexagonCore ["Hệ thống Lõi (Hexagon / Core)"]
        direction LR
        PrimaryPorts("Driving Ports (Use Cases)")
        DomainModels{"Domain Models (Entities)"}
        SecondaryPorts("Driven Ports (Repositories/Services)")
        
        PrimaryPorts --> DomainModels
        DomainModels --> SecondaryPorts
    end

    subgraph SecondaryAdapters ["Driven Adapters (Giao tiếp Đầu ra)"]
        DB[("PostgreSQL / MongoDB")]
        Email["Mail Service"]
        ThirdParty["3rd Party API"]
    end

    %% Mũi tên phụ thuộc
    Web --> PrimaryPorts
    CLI --> PrimaryPorts
    Test --> PrimaryPorts
    
    SecondaryAdapters -. "Implement ("Phụ thuộc vào Core")" .-> SecondaryPorts
```

## 7. Giải Thích Thuật Ngữ (Glossary)

- **Port (Cổng)**: Là một Interface (Bản thiết kế/Hợp đồng) do phần Lõi (Core) định nghĩa ra. Nó chỉ nói "Làm cái gì" chứ không nói "Làm như thế nào".
- **Adapter (Bộ chuyển đổi)**: Đoạn code thực thi cụ thể cho một Port. Nó giống như cục sạc chuyển điện 220V sang 5V cho điện thoại. Nó kết nối công nghệ bên ngoài với phần Lõi.
- **Driving Port / Primary Port (Cổng vào)**: Cửa ngõ để bên ngoài (như UI, API) ra lệnh cho ứng dụng làm việc. Thường là các interface của Use Case.
- **Driven Port / Secondary Port (Cổng ra)**: Giao diện mà phần Lõi dùng để giao tiếp với thế giới bên ngoài (Database, API ngoài). Thường là interface của Repository.
- **Dependency Inversion (DIP)**: Nguyên lý Đảo ngược Phụ thuộc trong bộ SOLID. Thay vì Module cấp cao (Logic) phụ thuộc Module cấp thấp (Database), thì cả hai phải phụ thuộc vào Abstraction (Interface/Port).
- **Dependency Injection (DI)**: Hành động truyền (bơm) một đối tượng cụ thể (Adapter) vào một đối tượng khác thông qua constructor, thay vì để đối tượng đó tự tạo mới ở bên trong. Đây là cách ta "cắm rắc" Adapter vào Port.
- **Inversion of Control (IoC)**: Đảo ngược quyền điều khiển. Thay vì ứng dụng tự quyết định lúc nào gọi framework, thì framework sẽ quyết định lúc nào gọi ứng dụng của bạn. Trong Hexagonal, IoC thể hiện ở việc DI quản lý việc khởi tạo các Adapters.
- **Domain Model**: Đối tượng cốt lõi chứa trạng thái và luật lệ kinh doanh của công ty (Ví dụ: Một tài khoản ngân hàng, không cho phép rút quá số dư). KHÔNG được chứa logic liên quan đến CSDL (như save(), find()).
- **Over-engineering**: Xây dựng một kiến trúc quá cồng kềnh, phức tạp so với yêu cầu thực tế của dự án, làm giảm tốc độ phát triển. Hexagonal có rủi ro trở thành over-engineering nếu dùng cho app quá bé.
