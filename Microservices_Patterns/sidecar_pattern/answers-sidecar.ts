/**
 * File: answers-sidecar.ts
 * ĐÁP ÁN BÀI TẬP SIDECAR PATTERN
 * 
 * Mô phỏng việc tách biệt App Chính (Chỉ lo nghiệp vụ) và Sidecar (Lo Hạ tầng).
 * Trong thực tế Kubernetes, đây sẽ là 2 tiến trình (container) khác nhau.
 */

// ============================================================================
// 1. SIDECAR PROCESS (Tiến trình phụ)
// Do đội DevOps viết, có thể chạy bằng ngôn ngữ khác (Go, Rust).
// Cắm chốt ở cổng Localhost:9999 để chờ App chính đẩy rác (Log, Metric) sang.
// ============================================================================
class LoggerMetricSidecar {
    public startListening() {
        console.log("[Sidecar - GoLang] Đã khởi động! Lắng nghe tại localhost:9999...");
        console.log("[Sidecar - GoLang] Đã thiết lập kết nối mã hóa mTLS tới Server Trung tâm.");
    }

    // Hứng dữ liệu thô từ App chính
    public receiveRawDataFromLocalhost(type: string, data: any) {
        if (type === 'LOG') {
            // Sidecar tự lo việc format JSON phức tạp, nén gzip rồi đẩy đi
            const jsonLog = `{ "timestamp": "${new Date().toISOString()}", "message": "${data}" }`;
            console.log(`[Sidecar -> ElasticSearch] Bắn Log: ${jsonLog}`);
        }
        if (type === 'METRIC') {
            console.log(`[Sidecar -> Grafana] Bắn Metric CPU/RAM:`, data);
        }
    }
}

// ============================================================================
// 2. MAIN APPLICATION (Tiến trình chính)
// Do đội Dev viết. Vô cùng trong sạch, chỉ có nghiệp vụ.
// ============================================================================
class PureOrderService {
    // Không cần import thư viện Log/Metric của hãng thứ 3.
    // Chỉ cần gọi qua một cổng Localhost duy nhất.
    private sendToSidecar(type: string, data: any) {
        // Giả lập gửi HTTP/gRPC qua localhost
        globalSidecar.receiveRawDataFromLocalhost(type, data);
    }

    public createOrder(productId: string) {
        this.sendToSidecar('LOG', 'Bắt đầu tạo đơn...');
        this.sendToSidecar('METRIC', { cpu: 85, ram: 512 });

        // LOGIC NGHIỆP VỤ LÕI (SẠCH SẼ, RÕ RÀNG)
        console.log(`\n[Business App] XỬ LÝ ĐƠN HÀNG THÀNH CÔNG CHO: ${productId}\n`);

        this.sendToSidecar('LOG', 'Đơn tạo xong.');
    }
}

// ============================================================================
// CHẠY THỬ (Giả lập Kubernetes Pod)
// ============================================================================
// Khởi tạo Sidecar trước
const globalSidecar = new LoggerMetricSidecar();
globalSidecar.startListening();

// Chạy App chính
const app = new PureOrderService();
app.createOrder("MACBOOK_PRO");
