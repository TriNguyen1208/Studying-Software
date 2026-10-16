/**
 * File: demo-strangler-fig.ts
 * Minh họa Anti-pattern: Big Bang / Client tự kết nối thẳng server.
 * Frontend biết quá nhiều về địa chỉ IP của các server backend, rất khó để chuyển đổi.
 */

// ============================================================================
// HỆ THỐNG CŨ NGUYÊN KHỐI (MONOLITH) - Chứa mọi thứ
// ============================================================================
class OldMonolithSystem {
    public handleUser() { return "Xử lý User (Hệ thống Cũ)"; }
    public handleOrder() { return "Xử lý Order (Hệ thống Cũ)"; }
    
    // Code tính năng này đã thối nát, rất hay sập
    public handlePayment() { return "Xử lý Thanh Toán (Hệ thống Cũ) - Rất chậm & hay lỗi!"; }
}

// ============================================================================
// HỆ THỐNG MỚI (MICROSERVICE) - Vừa mới code xong
// ============================================================================
class NewPaymentMicroservice {
    // Đã làm xong phiên bản xịn xò
    public handlePayment() { return "Xử lý Thanh Toán (HỆ THỐNG MỚI MICROSERVICE) - Siêu nhanh!"; }
}


// ============================================================================
// FRONTEND - LỖI Ở ĐÂY
// ============================================================================
function frontendAppCall() {
    console.log("=== FRONTEND GỌI API (KHÔNG CÓ PROXY Ở GIỮA) ===");
    
    const monolith = new OldMonolithSystem();
    const newService = new NewPaymentMicroservice();

    // Để dùng hệ thống mới, FE phải đi SỬA LẠI SOURCE CODE CỦA FE, 
    // thay đổi URL API chỗ này sang server mới. 
    // Nếu Mobile App đã được người dùng tải về điện thoại, ta không thể ép họ update ngay được!
    
    console.log(monolith.handleUser());
    console.log(monolith.handleOrder());
    
    // Nếu bẻ thẳng code FE vào hệ thống mới, rủi ro sập là rất cao mà không có đường lùi
    console.log(newService.handlePayment()); 
}

frontendAppCall();
