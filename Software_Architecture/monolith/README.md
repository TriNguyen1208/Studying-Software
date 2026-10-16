# Kiến trúc Monolithic (Nguyên khối)

> **Ý tưởng chính việc sử dụng:** Gom tất cả mọi logic từ UI, Business, Data vào một khối mã nguồn duy nhất. Dễ deploy nhưng khó mở rộng.
> **Ví dụ:** Một ứng dụng Laravel hoặc Spring Boot nguyên khối chạy trên một server duy nhất chứa hàng triệu dòng code.


## 1. Định nghĩa
**Monolith** (hay Monolithic Architecture) là một mô hình thiết kế phần mềm truyền thống, trong đó tất cả các thành phần của một ứng dụng (giao diện người dùng, logic xử lý nghiệp vụ, truy xuất dữ liệu) được gộp chung thành một khối duy nhất (single codebase) và triển khai (deploy) dưới dạng một ứng dụng duy nhất.

## 2. Đặc điểm
- **Một codebase duy nhất:** Toàn bộ mã nguồn của các module khác nhau (ví dụ: quản lý user, quản lý sản phẩm, thanh toán...) nằm chung trong một kho lưu trữ (repository) duy nhất.
- **Một tiến trình (process) duy nhất:** Khi chạy ứng dụng, tất cả các module đều hoạt động trên cùng một tiến trình của hệ điều hành.
- **Sử dụng chung cơ sở dữ liệu:** Thường thì toàn bộ ứng dụng Monolith sẽ kết nối đến một database duy nhất cho tất cả các nghiệp vụ.

## 3. Ưu điểm
- **Dễ phát triển ban đầu:** Việc khởi tạo dự án, viết code và gỡ lỗi (debug) rất đơn giản vì mọi thứ nằm ở một chỗ. Các function/class có thể gọi trực tiếp lẫn nhau.
- **Dễ kiểm thử (Testing):** Rất dễ để chạy end-to-end test vì bạn chỉ cần khởi động một ứng dụng duy nhất.
- **Dễ triển khai (Deployment):** Quá trình deploy đơn giản. Chỉ cần copy thư mục build lên server hoặc đóng gói thành một file thực thi duy nhất (ví dụ file `.jar` trong Java) và chạy.

## 4. Nhược điểm (Khi hệ thống lớn lên)
- **Khó bảo trì và khó hiểu:** Khi ứng dụng phình to, codebase trở nên khổng lồ ("Big Ball of Mud"). Developer mới sẽ mất rất nhiều thời gian để hiểu hệ thống. Một thay đổi nhỏ cũng có thể gây lỗi ở những nơi không ngờ tới do code dính chặt vào nhau (tightly coupled).
- **Thiếu linh hoạt về công nghệ:** Rất khó để áp dụng một ngôn ngữ lập trình hoặc công nghệ mới cho một tính năng cụ thể vì toàn bộ ứng dụng đã bị ràng buộc với tech stack ban đầu.
- **Thời gian khởi động chậm:** Ứng dụng quá lớn dẫn đến việc khởi động mất nhiều thời gian, làm chậm quá trình phát triển và deploy.
- **Deployment rủi ro và khó mở rộng (Scaling):** Một thay đổi nhỏ xíu cũng bắt buộc phải deploy lại toàn bộ ứng dụng. Khi muốn tăng cường hiệu suất (scale), bạn phải scale toàn bộ hệ thống (nhân bản toàn bộ ứng dụng lên nhiều server), dù có thể chỉ có một module (như module thanh toán) bị quá tải, gây lãng phí tài nguyên. Nếu có lỗi nghiêm trọng ở một module (vd: rò rỉ bộ nhớ), toàn bộ ứng dụng sẽ bị sập (crash).

## 5. Khi nào nên dùng Monolith?
- Khi mới bắt đầu dự án (MVP - Minimum Viable Product) để kiểm chứng ý tưởng nhanh chóng.
- Đội ngũ phát triển nhỏ.
- Ứng dụng có quy mô nhỏ, nghiệp vụ không quá phức tạp và không có nhu cầu mở rộng đột biến trong tương lai gần.
