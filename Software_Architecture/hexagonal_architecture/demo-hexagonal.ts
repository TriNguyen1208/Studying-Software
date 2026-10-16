/**
 * File: demo-hexagonal.ts
 * Mô phỏng Kiến trúc Lục giác (Ports & Adapters) trong TypeScript.
 * Quy tắc tối thượng: BÊN TRONG (Core) không được biết gì về BÊN NGOÀI (Adapters).
 */

// ============================================================================
// 1. DOMAIN (VÙNG LÕI 1 - THUẦN KHIẾT NHẤT)
// Đối tượng kinh doanh, KHÔNG có thư viện ngoài, KHÔNG có DB, hoàn toàn độc lập.
// ============================================================================
class Order {
    constructor(
        public readonly id: string,
        public readonly productName: string,
        public readonly price: number,
        public status: 'PENDING' | 'PAID'
    ) {}

    // Logic kinh doanh nằm ở đây
    markAsPaid() {
        if (this.price <= 0) throw new Error("Giá trị đơn hàng không hợp lệ");
        this.status = 'PAID';
    }
}

// ============================================================================
// 2. PORTS (CÁC CỔNG GIAO TIẾP - HỢP ĐỒNG)
// Do Core định nghĩa. Bên ngoài muốn chơi với Core thì phải theo luật (Interface) này.
// ============================================================================

// 2.A - DRIVEN PORT (SECONDARY PORT): Cổng Đầu Ra
// Core cần thao tác với DB, nên Core đưa ra hợp đồng này. 
// Core không quan tâm ai sẽ lưu, lưu bằng MySQL hay MongoDB.
interface OrderRepositoryPort {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
}

// 2.B - DRIVING PORT (PRIMARY PORT): Cổng Đầu Vào
// Hợp đồng để thế giới bên ngoài (API/CLI) ra lệnh cho Core.
interface CreateOrderUseCasePort {
    execute(productName: string, price: number): Promise<string>;
}


// ============================================================================
// 3. APPLICATION LOGIC / USE CASES (VÙNG LÕI 2)
// Quản lý luồng công việc (Workflow). Thực thi Driving Port và gọi Driven Port.
// ============================================================================
class OrderService implements CreateOrderUseCasePort {
    // Kỹ thuật Dependency Injection: 
    // Ta "bơm" cái Port vào đây, chứ không khởi tạo trực tiếp kết nối DB ở trong này!
    constructor(private readonly orderRepository: OrderRepositoryPort) {}

    async execute(productName: string, price: number): Promise<string> {
        console.log(`[Core Logic] Đang xử lý đơn hàng mới: ${productName}`);
        
        // Khởi tạo Domain Model
        const newOrder = new Order(
            Math.random().toString(36).substring(7), // Random ID
            productName,
            price,
            'PENDING'
        );

        // Core dùng cổng ra (Secondary Port) để lưu trữ
        await this.orderRepository.save(newOrder);
        
        return newOrder.id;
    }
}


// ============================================================================
// 4. ADAPTERS (THẾ GIỚI BÊN NGOÀI - CÔNG NGHỆ CỤ THỂ)
// Những cục chuyển đổi cắm vào các Port ở trên.
// ============================================================================

// 4.A - DRIVEN ADAPTER (SECONDARY ADAPTER): Triển khai (Implement) cái OrderRepositoryPort
// Adapter này sử dụng mảng tĩnh trong bộ nhớ RAM để giả lập Database.
class InMemoryOrderAdapter implements OrderRepositoryPort {
    private readonly database: Map<string, Order> = new Map();

    async save(order: Order): Promise<void> {
        console.log(`[Adapter DB] Lưu vào RAM In-Memory: ${order.id}`);
        this.database.set(order.id, order);
    }

    async findById(id: string): Promise<Order | null> {
        return this.database.get(id) || null;
    }
}

// 4.B - DRIVING ADAPTER (PRIMARY ADAPTER): Bộ điều khiển nhận HTTP Request
// Nhận data từ Client, format lại, rồi đẩy qua Cổng Đầu Vào (CreateOrderUseCasePort).
class WebControllerAdapter {
    constructor(private readonly useCase: CreateOrderUseCasePort) {}

    // Hàm này giả lập một API Route bên trong Express.js (VD: POST /orders)
    async handleCreateOrderRequest(reqBody: any) {
        console.log(`[Adapter HTTP] Nhận Request từ Client:`, reqBody);
        
        try {
            const { product, price } = reqBody;
            if (!product || !price) throw new Error("Missing params");

            // Gọi vào phần Lõi thông qua Port
            const id = await this.useCase.execute(product, price);
            
            console.log(`[Adapter HTTP] Trả Response: Thành công, ID=${id}`);
            return { status: 200, message: "OK", orderId: id };
        } catch (error: any) {
            console.log(`[Adapter HTTP] Lỗi: ${error.message}`);
            return { status: 400, message: error.message };
        }
    }
}


// ============================================================================
// 5. BOOTSTRAP / WIRING (LẮP RÁP CÁC MẢNH GHÉP)
// Ở nơi khởi động hệ thống (như index.ts), ta cắm rắc (Adapters) vào Core (Ports).
// ============================================================================
async function runSystem() {
    console.log("=== HỆ THỐNG KHỞI ĐỘNG ===");

    // 1. Khởi tạo cục Adapter DB (Bên ngoài)
    const databaseAdapter = new InMemoryOrderAdapter(); 

    // 2. Khởi tạo Core và CẮM cục DB Adapter vào thông qua Port (Dependency Injection)
    const coreService = new OrderService(databaseAdapter);

    // 3. Khởi tạo Web Adapter và cắm Core vào nó
    const httpController = new WebControllerAdapter(coreService);

    // 4. Khách hàng bắt đầu tương tác qua Web HTTP
    await httpController.handleCreateOrderRequest({ product: "Bàn Phím Cơ", price: 1500000 });
}

runSystem();
