/**
 * File: answers-eda.ts
 * ĐÁP ÁN BÀI TẬP EVENT-DRIVEN ARCHITECTURE (EDA)
 * 
 * Yêu cầu: Cô lập OrderService khỏi EmailService.
 * Giao tiếp trung gian qua một Message Broker (giả lập pub/sub).
 */

// ============================================================================
// 1. GIẢ LẬP MESSAGE BROKER (Thay thế cho Kafka/RabbitMQ)
// Nơi lưu và phân phối sự kiện. Không chứa bất kỳ logic nghiệp vụ nào.
// ============================================================================
class EventBroker {
    private subscribers: { [eventName: string]: Function[] } = {};

    // Hành động Subscribe (Lắng nghe)
    public subscribe(eventName: string, callback: Function) {
        if (!this.subscribers[eventName]) this.subscribers[eventName] = [];
        this.subscribers[eventName].push(callback);
    }

    // Hành động Publish (Phát loa thông báo)
    public publish(eventName: string, payload: any) {
        console.log(`[Broker] Nhận được Event <${eventName}>. Đang phát tán...`);
        const callbacks = this.subscribers[eventName] || [];
        
        // Phân phối tin nhắn cho người nghe một cách BẤT ĐỒNG BỘ (Async)
        // Không đợi người nghe xử lý xong.
        callbacks.forEach(cb => {
            setTimeout(() => cb(payload), 0); // Vứt ra background xử lý
        });
    }
}

const GLOBAL_BROKER = new EventBroker(); // Khởi tạo con Broker chung

// ============================================================================
// 2. HỆ THỐNG ĐẶT HÀNG (SERVICE A)
// ============================================================================
class GoodOrderService {
    public createOrder(orderId: string, email: string) {
        console.log(`\n[Order Service] Đang lưu đơn hàng ${orderId} vào DB... (Tiền đã thu)`);
        
        // Đã gỡ bỏ EmailServiceAPI. OrderService giờ KHÔNG BIẾT EmailService là thằng nào!
        
        // LA LÀNG lên cho thế giới biết
        const eventData = { orderId, email, time: new Date() };
        GLOBAL_BROKER.publish('OrderCreated', eventData);

        // Trả kết quả ngay lập tức cho UI. Web load siêu nhanh!
        console.log(`[Order Service] Trả kết quả thành công cho Web UI NGAY LẬP TỨC!`);
        return { status: "SUCCESS", orderId };
    }
}


// ============================================================================
// 3. HỆ THỐNG EMAIL (SERVICE B)
// ============================================================================
class EmailSubscriberService {
    constructor() {
        // Đăng ký nhận tin từ Bưu điện ngay khi khởi động
        GLOBAL_BROKER.subscribe('OrderCreated', this.handleOrderCreatedEvent.bind(this));
    }

    private async handleOrderCreatedEvent(payload: any) {
        console.log(`\n    [Email Service Background] Bắt được Event: OrderCreated của ${payload.email}`);
        
        // Giả lập mạng bị rớt
        const isNetworkDown = true; 
        if (isNetworkDown) {
            console.error(`    [Email Service Background] LỖI MẠNG! Không gửi mail được.`);
            // Ở hệ thống thật (Kafka), tin nhắn sẽ không bị xóa (không bị ACK).
            // Kafka sẽ giam tin nhắn lại, chờ con Email Service sống lại để nhét vào mồm nó ép chạy tiếp.
            // Nhờ vậy KHÔNG BAO GIỜ SỢ RỚT ĐƠN!
            return;
        }
        console.log(`    [Email Service Background] Đã gửi mail thành công.`);
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
function runSuccess() {
    console.log("=== CHẠY MÔ HÌNH HƯỚNG SỰ KIỆN (EDA) ===");
    
    // Khởi động các Microservices độc lập
    const emailMicroservice = new EmailSubscriberService(); // Nằm chầu chực ở background
    const orderMicroservice = new GoodOrderService();

    // Khách hàng bấm nút trên Web
    orderMicroservice.createOrder("ORD_999", "bob@gmail.com");

    // LƯU Ý KẾT QUẢ IN RA: 
    // Mặc dù Email bị lỗi, nhưng Order vẫn báo "SUCCESS" cho Web UI. 
    // Các lỗi của hâu cần đã được giấu kín và xử lý riêng biệt. Hệ thống chịu lỗi cực kỳ dai sức.
}

runSuccess();
