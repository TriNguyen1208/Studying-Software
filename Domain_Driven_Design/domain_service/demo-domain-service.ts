/**
 * File: demo-domain-service.ts
 * Minh họa Anti-pattern: Ép uổng một nghiệp vụ liên quan nhiều Entity
 * vào bên trong một Entity duy nhất.
 */

// ============================================================================
// VẤN ĐỀ: NHÉT LOGIC CHUYỂN TIỀN VÀO TRONG ACCOUNT
// ============================================================================
export class BadAccount {
    public id: string;
    private balance: number;

    constructor(id: string, initialBalance: number) {
        this.id = id;
        this.balance = initialBalance;
    }

    public withdraw(amount: number) {
        if (this.balance < amount) throw new Error("Không đủ tiền");
        this.balance -= amount;
    }

    public deposit(amount: number) {
        this.balance += amount;
    }

    // LỖI THIẾT KẾ: Hàm này bắt Account hiện tại phải tương tác trực tiếp và sửa đổi Account khác!
    // Trách nhiệm (Responsibility) bị lấn sân.
    public transferTo(otherAccount: BadAccount, amount: number) {
        console.log(`[Anti-pattern] Đang chuyển ${amount} từ ${this.id} sang ${otherAccount.id}...`);
        
        // 1. Nếu việc chuyển tiền có tính phí (Fee), thì tiền phí thuộc về hệ thống ngân hàng,
        // nhét vào đây sẽ rất vô lý.
        const fee = amount * 0.01; 
        
        // 2. Tự tay thọc vào gọi hàm của người khác. 
        // Lỡ bị lỗi ở giữa chừng, không có một "Bên thứ 3" nào đứng ra phân xử hay Rollback.
        this.withdraw(amount + fee);
        otherAccount.deposit(amount);
    }

    public getBalance() {
        return this.balance;
    }
}

// --- CHẠY THỬ ---
function test() {
    const accA = new BadAccount("A", 1000);
    const accB = new BadAccount("B", 500);

    // Có vẻ tiện, nhưng về mặt kiến trúc là sai.
    accA.transferTo(accB, 200);

    console.log(`Số dư A: ${accA.getBalance()}`); // 1000 - 200 - 2(fee) = 798
    console.log(`Số dư B: ${accB.getBalance()}`); // 500 + 200 = 700
}

test();
