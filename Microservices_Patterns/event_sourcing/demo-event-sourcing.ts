/**
 * File: demo-event-sourcing.ts
 * Mô phỏng CRUD truyền thống (State-based).
 * Dữ liệu cũ bị mất mãi mãi, không có lịch sử.
 */

class TraditionalAccount {
    public balance: number;

    constructor(initialBalance: number) {
        this.balance = initialBalance;
    }

    public deposit(amount: number) {
        // GHI ĐÈ TRỰC TIẾP LÊN TRẠNG THÁI HIỆN TẠI
        this.balance += amount; 
        console.log(`[CRUD] Đã nạp ${amount}. Số dư mới: ${this.balance}`);
    }

    public withdraw(amount: number) {
        if (this.balance < amount) throw new Error("Không đủ tiền");
        this.balance -= amount;
        console.log(`[CRUD] Đã rút ${amount}. Số dư mới: ${this.balance}`);
    }
}

// --- CHẠY THỬ ---
function run() {
    const acc = new TraditionalAccount(0);
    
    acc.deposit(1000); 
    // Số dư = 1000. Dữ liệu trong SQL: UPDATE balance = 1000. Lịch sử lúc = 0 bị xóa mất.
    
    acc.withdraw(300);
    // Số dư = 700. Cập nhật SQL: UPDATE balance = 700. Dấu vết 1000 biến mất.

    // NẾU CÔNG AN YÊU CẦU: Chứng minh làm sao có 700? 
    // Trả lời: Bó tay, vì hệ thống chỉ lưu con số 700 cuối cùng!
}

run();
