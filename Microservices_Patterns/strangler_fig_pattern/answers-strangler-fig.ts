/**
 * File: answers-strangler-fig.ts
 * ĐÁP ÁN BÀI TẬP STRANGLER FIG PATTERN
 * 
 * Yêu cầu: Tạo một lớp Proxy ở giữa (Nginx, API Gateway giả lập).
 * Client chỉ cần gọi qua Proxy, Proxy tự điều phối để bòn rút dần hệ thống cũ.
 */

// Hệ thống Cũ & Mới (Giữ nguyên)
class OldMonolithSystem {
    public handle(url: string) { return `Xử lý ${url} (TỪ HỆ THỐNG CŨ)`; }
}
class NewPaymentMicroservice {
    public handle(url: string) { return `Xử lý ${url} (TỪ MICROSERVICE MỚI - SIÊU TỐC)`; }
}


// ============================================================================
// 1. PROXY FACADE (ĐỨNG CHẮN Ở CỔNG)
// Thường đây là file cấu hình của Nginx, HAProxy, AWS API Gateway, hoặc Express Router.
// ============================================================================
class StranglerFigProxy {
    private oldSystem = new OldMonolithSystem();
    private newPaymentSys = new NewPaymentMicroservice();

    // MÁNG TRƯỢT HỨNG REQUEST (ROUTER)
    public routeRequest(url: string): string {
        console.log(`\n[Proxy] Hứng được request HTTP GET ${url}... Đang phân tích Rule...`);

        // ĐÂY CHÍNH LÀ TRÁI TIM CỦA STRANGLER FIG
        // Rule: Chức năng nào đã code xong bên hệ thống mới thì BẺ LÁI qua đó.
        if (url === "/api/payment") {
            console.log(`[Proxy] -> Bẻ lái sang hệ thống Mới!`);
            return this.newPaymentSys.handle(url);
        }

        // Rule: Bất kỳ URL nào chưa làm (như /api/users, /api/orders), thả cho trôi về hệ thống Cũ.
        console.log(`[Proxy] -> Thả trôi về hệ thống Cũ.`);
        return this.oldSystem.handle(url);
    }

    // ĐƯỜNG LÙI CHIẾN LƯỢC (FALLBACK):
    // Nếu hệ thống mới lỗi, ta chỉ cần vào code này comment cái "if" lại, lập tức 100% traffic chạy về hệ thống cũ!
}


// ============================================================================
// CHẠY THỬ (INTEGRATION)
// ============================================================================
function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH STRANGLER FIG (CHUYỂN GIAO MƯỢT MÀ) ===");
    
    const gateway = new StranglerFigProxy();

    // Frontend KHÔNG ĐỔI BẤT KỲ DÒNG CODE NÀO. 
    // Vẫn gọi domain cũ (api.mycompany.com)
    
    // User gọi tính năng cũ (Chưa làm lại)
    const result1 = gateway.routeRequest("/api/users");
    console.log("Kết quả:", result1);

    const result2 = gateway.routeRequest("/api/orders");
    console.log("Kết quả:", result2);

    // User gọi tính năng thanh toán (Bị bẻ lái ngầm qua Microservices)
    const result3 = gateway.routeRequest("/api/payment");
    console.log("Kết quả:", result3);
}

runSuccess();
