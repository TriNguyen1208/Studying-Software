# Kiến trúc Micro-Frontend (Phân tích dựa trên Source Code)

Dựa trên mã nguồn của dự án `micro-frontend-demo`, chúng ta có thể phân tích và hiểu rõ cách một kiến trúc Micro-Frontend được tổ chức và hoạt động trong thực tế. 

Dự án này sử dụng công nghệ cốt lõi là **Webpack Module Federation**, một tính năng mạnh mẽ của Webpack 5 giúp các ứng dụng JavaScript độc lập có thể chia sẻ code với nhau tại thời điểm chạy (runtime).

## 1. Cấu trúc tổng thể (Monorepo & Turborepo)
Thay vì chia mỗi Micro-Frontend thành một repository riêng biệt (đôi khi gây khó khăn cho việc quản lý), dự án này áp dụng mô hình **Monorepo** thông qua **Yarn Workspaces** và **Turborepo** (`turbo.json`). 

Cấu trúc gồm 3 ứng dụng chính (nằm trong mảng `workspaces` của `package.json`):
*   **`main`**: Đóng vai trò là "Host" hoặc "Shell" (Vỏ ứng dụng chính). Nó chịu trách nhiệm chứa khung giao diện và nhúng các Micro-Frontend khác vào.
*   **`products`**: Là một "Remote" Micro-Frontend, chịu trách nhiệm về nghiệp vụ hiển thị danh sách sản phẩm.
*   **`cart`**: Là một "Remote" Micro-Frontend khác, chịu trách nhiệm về nghiệp vụ giỏ hàng và thanh toán.

## 2. Nguyên lý hoạt động với Webpack Module Federation
Mỗi ứng dụng (`main`, `cart`, `products`) đều có một file `webpack.config.js` riêng biệt và chạy trên một port khác nhau (`main`: 9001, `products`: 9002, `cart`: 9003).

Sự kỳ diệu của Micro-Frontend nằm ở plugin `ModuleFederationPlugin` được cấu hình trong các file webpack này. Nó định nghĩa 3 khái niệm chính: **Exposes**, **Remotes**, và **Shared**.

### A. Cung cấp chức năng ra bên ngoài (Exposes)
Các ứng dụng Remote có thể "mở cửa" để ứng dụng khác lấy Component của mình về dùng. 
Ví dụ, trong `products/webpack.config.js`:
```javascript
exposes: {
  "./ProductsList": "./src/components/ProductsList",
  "./ProductCard": "./src/components/ProductCard",
  "./products": "./src/products",
}
```
Micro-Frontend `products` công bố ra ngoài 3 thành phần. Bất cứ ứng dụng nào khác cũng có thể tải và sử dụng trực tiếp các component này như thể chúng được viết trong cùng một dự án.

Tương tự, `cart` mở ra:
```javascript
exposes: {
  "./Cart": "./src/components/CartButton",
  "./CheckoutPage": "./src/features/checkout",
}
```

### B. Tiêu thụ chức năng từ bên ngoài (Remotes)
Khi một ứng dụng cần dùng Component của ứng dụng khác, nó sẽ định nghĩa đối tác trong phần `remotes`.
Ví dụ, `cart` cần lấy thông tin sản phẩm từ `products`:
```javascript
remotes: {
  PRODUCTS: `PRODUCTS@${PRODUCTS_HOST}/remoteEntry.js`,
}
```
*Lưu ý: `remoteEntry.js` là một file manifest đặc biệt do Webpack tạo ra, chứa thông tin bản đồ để tải các component được exposes.*

Đáng chú ý là dự án này thể hiện sự **Tích hợp hai chiều (Bidirectional)**: `cart` gọi `products` và ngược lại `products` cũng định nghĩa `CART` trong `remotes`. Đây là tính linh hoạt rất cao của Module Federation so với các giải pháp iframe cũ.

### C. Chia sẻ thư viện chung (Shared Dependencies)
Một vấn đề lớn của Micro-Frontend là mỗi ứng dụng có thể tải lại thư viện React riêng của mình, gây lãng phí bộ nhớ và lỗi xung đột trạng thái. Module Federation giải quyết việc này qua cấu hình `shared`:

```javascript
shared: {
  ...dependencies,
  react: {
    eager: true,
    singleton: true,
    requiredVersion: dependencies["react"],
  },
  "react-dom": {
    eager: true,
    singleton: true,
    requiredVersion: dependencies["react-dom"],
  },
}
```
*   **`singleton: true`**: Đảm bảo toàn bộ trang web chỉ khởi tạo đúng 1 phiên bản (instance) duy nhất của thư viện `react` và `react-dom`. Tất cả các Micro-Frontend sẽ dùng chung phiên bản này.

## 3. Lợi ích kiến trúc rút ra từ dự án
Qua mã nguồn này, ta thấy rõ các đặc trưng của Micro-Frontend:
1.  **Phân chia Domain độc lập**: Code liên quan đến "Sản phẩm" nằm gọn trong `products`, "Giỏ hàng" nằm trong `cart`.
2.  **Độc lập công nghệ (một phần)**: Tuy dự án này đều dùng React, nhưng nhờ `ModuleFederation`, bạn hoàn toàn có thể cấu hình để `cart` chạy bằng VueJS nếu cấu hình chia sẻ phù hợp.
3.  **Tích hợp Runtime**: Các Component không được đóng gói (build) chung vào 1 cục duy nhất ở `main`. Chúng được tải qua mạng (thông qua URL `remoteEntry.js`) ngay khi trình duyệt cần render. Nếu team `cart` cập nhật giao diện nút giỏ hàng và deploy, ứng dụng `main` sẽ tự động nhận giao diện mới mà không cần phải build lại `main`.

---
*Tài liệu được phân tích trực tiếp từ cấu trúc cấu hình Webpack và Monorepo của dự án micro-frontend-demo.*
