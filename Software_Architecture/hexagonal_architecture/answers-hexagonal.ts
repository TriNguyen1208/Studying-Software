/**
 * File: answers-hexagonal.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH HEXAGONAL ARCHITECTURE
 * 
 * Yêu cầu: Đổi cơ sở dữ liệu từ In-Memory (RAM) sang lưu trữ File JSON cứng,
 * nhưng KHÔNG ĐƯỢC CHẠM vào bất kỳ dòng code nào của phần Core (OrderService).
 */

import * as fs from 'fs'; // Import thư viện ghi file của NodeJS

// Ở đây ta có Order class và OrderRepositoryPort (Được quy định trong Core).
// Giả định ta đã import chúng từ phần Core:
// import { Order, OrderRepositoryPort, OrderService } from './demo-hexagonal';

// (Mô phỏng lại Port để code không báo lỗi khi đọc file rời)
interface OrderRepositoryPort {
    save(order: any): Promise<void>;
    findById(id: string): Promise<any | null>;
}

// ============================================================================
// ĐÁP ÁN 1: VIẾT MỘT SECONDARY ADAPTER HOÀN TOÀN MỚI
// Adapter này sẽ implement đúng cái Port mà Core yêu cầu. 
// Nhờ vậy Core sẽ tin tưởng và dùng nó mà không cần sửa code.
// ============================================================================
class FileSystemOrderAdapter implements OrderRepositoryPort {
    private readonly filePath = './database-orders.json';

    constructor() {
        // Tạo file cứng nếu chưa tồn tại
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}));
        }
    }

    async save(order: any): Promise<void> {
        console.log(`[Adapter File] Lưu vào ổ cứng JSON File: ${order.id}`);
        
        // Đọc file cũ
        const rawData = fs.readFileSync(this.filePath, 'utf-8');
        const db = JSON.parse(rawData);
        
        // Thêm dữ liệu mới
        db[order.id] = order;
        
        // Ghi đè vào ổ cứng
        fs.writeFileSync(this.filePath, JSON.stringify(db, null, 2));
    }

    async findById(id: string): Promise<any | null> {
        const rawData = fs.readFileSync(this.filePath, 'utf-8');
        const db = JSON.parse(rawData);
        return db[id] || null;
    }
}


// ============================================================================
// ĐÁP ÁN 2: "RÚT RẮC, CẮM LẠI" (DEPENDENCY INJECTION MỚI)
// Ở phần khởi động ứng dụng (Wiring), ta thay đổi Adapter được bơm vào Core.
// ============================================================================

// (Mô phỏng phần Core)
class OrderService {
    constructor(private readonly orderRepository: OrderRepositoryPort) {}
    async execute() { 
        await this.orderRepository.save({ id: "123", status: "PENDING" }); 
    }
}

async function bootSystem() {
    // TRƯỚC ĐÂY: 
    // const databaseAdapter = new InMemoryOrderAdapter(); 

    // BÂY GIỜ: Chỉ cần đổi Adapter mới
    const newDatabaseAdapter = new FileSystemOrderAdapter();

    // Core (OrderService) vẫn giữ nguyên, không biết sự thay đổi này!
    // Nguyên lý "Mở để mở rộng, Đóng để sửa đổi" (Open-Closed Principle) được thỏa mãn.
    const coreService = new OrderService(newDatabaseAdapter);

    // Chạy thử
    await coreService.execute();
}

bootSystem();
