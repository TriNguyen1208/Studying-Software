/**
 * File: demo-sidecar.ts
 * Minh họa Anti-pattern: Gộp chung mã Hạ tầng (Infrastructure) 
 * vào cùng file với mã Nghiệp vụ (Business Logic).
 */

export class MonolithicOrderService {
    
    // Đống code hạ tầng hầm bà lằng rác rến
    private connectToCentralLogging() { console.log("[Infra] Mở kết nối TCP tới ElasticSearch..."); }
    private formatLogToJson(msg: string) { return `{ "time": "${new Date().toISOString()}", "log": "${msg}" }`; }
    private sendMetric(cpu: number, ram: number) { console.log(`[Infra] Bắn metric CPU=${cpu}, RAM=${ram} lên Grafana`); }
    
    constructor() {
        this.connectToCentralLogging();
    }

    // ============================================================================
    // VẤN ĐỀ: LOGIC NGHIỆP VỤ BỊ CHÌM NGHỈM TRONG ĐỐNG CODE HẠ TẦNG
    // Nếu ngày mai công ty đổi hệ thống Log sang AWS CloudWatch, ta phải vào sửa file này.
    // ============================================================================
    public createOrder(productId: string) {
        // Tốn công làm format log
        const logStart = this.formatLogToJson("Bắt đầu tạo đơn...");
        console.log(logStart);
        
        // Bắn metric hệ thống (Không liên quan gì tới Đơn hàng cả!)
        this.sendMetric(80, 1024);

        // ĐÂY MỚI LÀ CÁI QUAN TRỌNG NHẤT CỦA FILE NÀY:
        console.log(`[Business Logic] Đã tạo đơn hàng thành công cho sản phẩm ${productId}`);
        
        const logEnd = this.formatLogToJson("Đơn tạo xong.");
        console.log(logEnd);
    }
}

// --- CHẠY THỬ ---
const app = new MonolithicOrderService();
app.createOrder("IPHONE_15");
