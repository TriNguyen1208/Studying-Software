/**
 * File: answers-domain-service.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH DOMAIN SERVICE
 * 
 * Yêu cầu: Tách logic chuyển tiền ra khỏi Entity Account.
 * Tạo một Domain Service độc lập (Stateless) để điều phối nghiệp vụ này.
 */

// ============================================================================
// 1. RICH ENTITY (Chỉ chứa logic tự thân)
// ============================================================================
export class Account {
    constructor(
        public readonly id: string,
        private balance: number
    ) {}

    // Rút tiền của MÌNH
    public withdraw(amount: number) {
        if (amount <= 0) throw new Error("Số tiền không hợp lệ");
        if (this.balance < amount) throw new Error("Số dư không đủ");
        this.balance -= amount;
    }

    // Nạp tiền vào MÌNH
    public deposit(amount: number) {
        if (amount <= 0) throw new Error("Số tiền không hợp lệ");
        this.balance += amount;
    }

    public getBalance(): number {
        return this.balance;
    }
}

// ============================================================================
// 2. DOMAIN SERVICE (Nơi chứa logic đa-thực-thể)
// Tên class thể hiện rõ đây là một "Dịch vụ"
// ============================================================================
export class MoneyTransferDomainService {
    
    // Stateless function: Không lưu giữ dữ liệu vào các biến `this.xyz`.
    // Mọi nguyên liệu cần thiết để nấu ăn đều truyền qua tham số.
    public transfer(sourceAccount: Account, targetAccount: Account, amount: number) {
        console.log(`\n[Domain Service] Bắt đầu phiên giao dịch chuyển ${amount}...`);
        
        // Tính toán các luật lệ kinh doanh bự (như Phí giao dịch, Thuế...)
        const fee = this.calculateTransferFee(amount);
        const totalDeduction = amount + fee;

        try {
            // "Nhạc trưởng" điều phối 2 Entity
            sourceAccount.withdraw(totalDeduction);
            targetAccount.deposit(amount);
            
            console.log(`[Domain Service] Giao dịch thành công! Thu phí: ${fee}`);
        } catch (error: any) {
            console.log(`[Domain Service] Giao dịch THẤT BẠI: ${error.message}`);
            // Xử lý rollback hoặc đền bù nếu cần
        }
    }

    // Một logic kinh doanh thuần túy, rất phù hợp nằm ở Domain Service
    private calculateTransferFee(amount: number): number {
        return amount > 1000 ? 0 : amount * 0.01; // Chuyển trên 1000 thì miễn phí
    }
}

// ============================================================================
// CHẠY THỬ
// ============================================================================
function runTest() {
    console.log("=== CHẠY MÔ HÌNH DOMAIN SERVICE ===");
    
    const accA = new Account("ACC_A", 1000);
    const accB = new Account("ACC_B", 500);

    // Khởi tạo Service (Hoặc có thể inject qua DI container)
    const transferService = new MoneyTransferDomainService();

    // Dùng Service để xử lý giao dịch
    transferService.transfer(accA, accB, 200);

    console.log(`Số dư cuối cùng ACC_A: ${accA.getBalance()}`); // 1000 - 200 - 2 = 798
    console.log(`Số dư cuối cùng ACC_B: ${accB.getBalance()}`); // 500 + 200 = 700
}

runTest();
