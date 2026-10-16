/**
 * Demo một ứng dụng E-commerce đơn giản theo kiến trúc Monolith sử dụng Node.js và Express.
 * Điểm đặc trưng: Tất cả các module (Users, Products, Orders) đều nằm chung trong một tệp/ứng dụng
 * và chạy chung trên một process (vùng nhớ). Các module chia sẻ tài nguyên và gọi trực tiếp lẫn nhau.
 */

// Import/Gọi thư viện Express vào dự án để giúp chúng ta xây dựng API Web một cách dễ dàng
const express = require('express');

// Khởi tạo một đối tượng Web Server (app) từ thư viện express
const app = express();

// Khai báo một Middleware: Dòng này có tác dụng dịch (parse) các dữ liệu mà Client 
// gửi lên (ví dụ gửi qua phương thức POST) dưới dạng JSON thành một Object trong Javascript.
app.use(express.json());


// ==========================================
// MODULE 1: QUẢN LÝ NGƯỜI DÙNG (USERS)
// ==========================================
// Dữ liệu mô phỏng được lưu trữ thẳng trong RAM (Đây là Database thu nhỏ dùng chung cho cả hệ thống).
let users = [{ id: 1, name: 'Nguyen Van A', balance: 5000 }];

// Định nghĩa API lấy danh sách người dùng (GET /users)
app.get('/users', (req, res) => {
    // Dùng hàm res.json() để trực tiếp gửi mảng 'users' về cho trình duyệt (Client) dưới dạng JSON.
    res.json(users);
});


// ==========================================
// MODULE 2: QUẢN LÝ SẢN PHẨM (PRODUCTS)
// ==========================================
// Mảng danh sách sản phẩm. Nó lưu trên cùng bộ nhớ RAM với module Users.
let products = [{ id: 101, name: 'Laptop', price: 1000, stock: 5 }];

// Định nghĩa API lấy danh sách sản phẩm (GET /products)
app.get('/products', (req, res) => {
    // Trả về JSON mảng sản phẩm
    res.json(products);
});


// ==========================================
// MODULE 3: QUẢN LÝ ĐƠN HÀNG (ORDERS)
// ==========================================
// Mảng dùng để lưu trữ lại các đơn hàng đã đặt thành công
let orders = [];

// Định nghĩa API tạo đơn hàng mới (Mua hàng) - Sử dụng phương thức POST
app.post('/orders', (req, res) => {
    // Trích xuất mã người dùng (userId) và mã sản phẩm (productId) từ "cơ thể" (body) của Request do Client gửi lên.
    const { userId, productId } = req.body;
    
    // ĐÂY LÀ ĐẶC ĐIỂM QUAN TRỌNG NHẤT CỦA KIẾN TRÚC MONOLITH:
    // Vì module Order đang nằm chung một ngôi nhà (cùng một process/vùng RAM) với module User và Product,
    // nên nó có thể "thọc tay" thẳng vào biến mảng `users` và `products` để tra cứu thông tin 
    // cực kỳ thần tốc, mà không cần phải gửi request gọi API qua mạng (như trong Microservices).
    const user = users.find(u => u.id === userId); // Tìm user trong mảng users
    const product = products.find(p => p.id === productId); // Tìm product trong mảng products

    // BƯỚC VALIDATE (Kiểm tra logic nghiệp vụ/ràng buộc)
    // 1. Kiểm tra User đó có thực sự tồn tại trong hệ thống không? (Nếu không, trả về lỗi 404 - Not Found)
    if (!user) return res.status(404).json({ error: 'User không tồn tại!' });
    // 2. Kiểm tra Sản phẩm có tồn tại không?
    if (!product) return res.status(404).json({ error: 'Product không tồn tại!' });
    // 3. Kiểm tra xem kho có còn hàng không? (stock > 0)
    if (product.stock <= 0) return res.status(400).json({ error: 'Sản phẩm đã hết hàng!' });
    // 4. Kiểm tra tài khoản (balance) của user có đủ tiền để mua sản phẩm này không?
    if (user.balance < product.price) return res.status(400).json({ error: 'Tài khoản không đủ tiền!' });

    // CẬP NHẬT TRẠNG THÁI (Update State / Ghi vào Database)
    // Module Order có quyền ngang nhiên sửa đổi thông tin của Product (Trừ đi 1 món hàng)
    product.stock -= 1;
    // Và trừ tiền trực tiếp vào tài khoản (balance) của User
    user.balance -= product.price;

    // Gói gém các thông tin tạo thành một bản ghi Đơn hàng mới
    const newOrder = {
        id: orders.length + 1,        // ID tự tăng bằng độ dài mảng + 1
        userId: user.id,              // Ghi nhớ ai là người mua
        productId: product.id,        // Mua món gì
        totalPrice: product.price,    // Tiền thanh toán là bao nhiêu
        status: 'SUCCESS',            // Ghi nhận trạng thái mua thành công
        createdAt: new Date()         // Đóng dấu thời gian mua hàng
    };
    
    // Lưu đơn hàng vừa tạo vào mảng lưu trữ chung
    orders.push(newOrder);
    
    // Phản hồi về cho Client biết giao dịch đã xử lý xong (Status 201: HTTP Created)
    res.status(201).json({ message: 'Đặt hàng thành công', order: newOrder });
});

// API phụ: Lấy danh sách toàn bộ các đơn hàng đã được đặt (GET /orders)
app.get('/orders', (req, res) => {
    // Trả ra mảng orders
    res.json(orders);
});


// ==========================================
// KHỞI ĐỘNG SERVER (Chỉ 1 server duy nhất "gánh" mọi tính năng)
// ==========================================
// Cài đặt cổng mạng là 3000
const PORT = 3000;

// Bật máy chủ và lắng nghe khách truy cập vào cổng 3000
app.listen(PORT, () => {
    // In ra màn hình console để báo cho lập trình viên biết server đã chạy thành công
    console.log(`🚀 Monolith App đang chạy tại http://localhost:${PORT}`);
    console.log(`- API Users: GET http://localhost:${PORT}/users`);
    console.log(`- API Products: GET http://localhost:${PORT}/products`);
    console.log(`- API Orders: POST http://localhost:${PORT}/orders`);
    console.log('\n=> KẾT LUẬN: Toàn bộ ứng dụng (3 module) đang chia sẻ chung 1 vùng RAM và 1 Tiến trình (Process) duy nhất.');
});
