/**
 * File: answers-event-sourcing.ts
 * ĐÁP ÁN BÀI TẬP EVENT SOURCING
 * 
 * Yêu cầu: Viết lại Entity Account sao cho trạng thái không bị ghi đè,
 * mà được TÍNH TOÁN RA dựa trên việc phát lại (Replay) danh sách Events.
 */

// ============================================================================
// 1. ĐỊNH NGHĨA CÁC SỰ KIỆN (EVENTS) 
// Sự kiện đại diện cho những thứ ĐÃ XẢY RA TRONG QUÁ KHỨ (Quá khứ phân từ).
// ============================================================================
interface DomainEvent {
    type: string;
    timestamp: Date;
    payload: any;
}

// ============================================================================
// 2. EVENT SOURCED ENTITY
// ============================================================================
class EventSourcedAccount {
    public id: string;
    
    // TRẠNG THÁI HIỆN HÀNH (Chỉ tồn tại trên RAM, KHÔNG LƯU VÀO DB)
    private _balance: number = 0; 
    
    // MẢNG LƯU TRỮ SỰ KIỆN CHƯA LƯU (Uncommitted Events - sẽ được đẩy xuống DB)
    private _uncommittedEvents: DomainEvent[] = [];

    constructor(id: string) {
        this.id = id;
    }

    // --- CÁC HÀM XỬ LÝ LỆNH TỪ BÊN NGOÀI (COMMANDS) ---
    // Kiểm tra nghiệp vụ (Invariants), nếu đúng thì TẠO SỰ KIỆN mới.
    public deposit(amount: number) {
        if (amount <= 0) throw new Error("Tiền nạp phải > 0");
        this.addEvent({ type: 'MoneyDeposited', timestamp: new Date(), payload: { amount } });
    }

    public withdraw(amount: number) {
        // Phải dựa vào balance trên RAM (do các sự kiện cũ tái tạo thành) để check logic
        if (this._balance < amount) throw new Error("Không đủ tiền");
        this.addEvent({ type: 'MoneyWithdrawn', timestamp: new Date(), payload: { amount } });
    }

    // --- HÀM CỐT LÕI CỦA EVENT SOURCING ---
    // Ghi sự kiện vào mảng, rồi APPLY nó lên Entity
    private addEvent(event: DomainEvent) {
        this._uncommittedEvents.push(event);
        this.applyEvent(event); // Cập nhật trạng thái RAM ngay lập tức
    }

    // --- HÀM THỦY PHÂN (REHYDRATE / MUTATOR) ---
    // Vắt dữ liệu từ Event ra để tính toán trạng thái Entity.
    // LƯU Ý: Tuyệt đối không được chứa logic if/else báo lỗi ở đây, 
    // vì event là QUÁ KHỨ đã xảy ra rồi, bắt buộc phải chấp nhận.
    public applyEvent(event: DomainEvent) {
        switch (event.type) {
            case 'AccountCreated':
                this.id = event.payload.id;
                this._balance = 0;
                break;
            case 'MoneyDeposited':
                this._balance += event.payload.amount; // Không ghi đè, mà cộng dồn
                break;
            case 'MoneyWithdrawn':
                this._balance -= event.payload.amount;
                break;
        }
    }

    public getBalance(): number {
        return this._balance;
    }

    // Hàm cung cấp các Event mới để Repository lấy và INSERT xuống Event Store DB
    public getUncommittedEvents() {
        return this._uncommittedEvents;
    }
}

// ============================================================================
// CHẠY THỬ: 
// ============================================================================
function runEventSourcing() {
    console.log("=== CHẠY MÔ HÌNH EVENT SOURCING ===");
    
    // Tình huống 1: Người dùng thao tác
    const account = new EventSourcedAccount("ACC_1");
    account.applyEvent({ type: 'AccountCreated', timestamp: new Date(), payload: { id: "ACC_1" } }); // Khởi tạo từ quá khứ
    
    account.deposit(1000);
    account.withdraw(300);

    console.log("Số dư hiện tại:", account.getBalance()); // 700

    // CÔNG AN YÊU CẦU: Chứng minh tại sao có 700?
    // Trả lời: Bằng cách xuất toàn bộ Event (Lịch sử không thể chối cãi) ra cho xem!
    console.log("Sổ cái kế toán (Audit Log/Events):");
    console.table(account.getUncommittedEvents().map(e => ({ Type: e.type, Amount: e.payload.amount })));

    // Tình huống 2: Mở máy chủ lại sau khi sập (Rehydrate)
    // Hệ thống sẽ lấy mảng Event từ DB ra, tạo Account rỗng, vòng lặp gán applyEvent() từng cái một
    // Trạng thái (balance = 700) sẽ tự động phục hồi!
}

runEventSourcing();
