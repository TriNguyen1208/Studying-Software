/**
 * File: demo-ddd.ts
 * Minh họa sự khác biệt giữa Anemic Domain Model (Anti-pattern)
 * và Rich Domain Model (DDD Standard).
 */

// ============================================================================
// CÁCH 1: ANEMIC DOMAIN MODEL (MÔ HÌNH THIẾU MÁU - ANTI-PATTERN TRONG DDD)
// Đây là cách đa số lập trình viên viết code khi mới đi làm.
// ============================================================================

// Entity "thiếu máu": Chỉ là 1 cái túi đựng data vô tri vô giác.
// Các biến (balance) bị public hoặc có hàm set() cho phép ai cũng có thể sửa tùy ý.
class AnemicBankAccount {
    public id: string;
    public balance: number; // Nguy hiểm: Bất kỳ ai cũng có thể gán account.balance = 1000000
    public status: string;

    constructor(id: string, balance: number) {
        this.id = id;
        this.balance = balance;
        this.status = "ACTIVE";
    }
}

// Logic kinh doanh (rút tiền) bị quăng ra ngoài một cục Service.
// Hậu quả: Nếu có 1 Service khác cũng rút tiền mà quên check balance < 0, dữ liệu sẽ bị lỗi!
class AnemicBankService {
    public withdraw(account: AnemicBankAccount, amount: number) {
        console.log(`[Anemic] Yêu cầu rút ${amount} từ tài khoản ${account.id}...`);
        
        if (account.status !== "ACTIVE") {
            throw new Error("Tài khoản bị khóa");
        }
        if (account.balance < amount) {
            throw new Error("Không đủ số dư");
        }

        // Service nhảy vào SỬA TRỰC TIẾP dữ liệu bên trong Entity
        account.balance -= amount;
        console.log(`[Anemic] Rút thành công. Số dư mới: ${account.balance}`);
    }
}


// ============================================================================
// CÁCH 2: RICH DOMAIN MODEL (MÔ HÌNH PHONG PHÚ - CHUẨN TƯ DUY DDD)
// Đóng gói cả "Dữ liệu" và "Hành vi (Nghiệp vụ)" vào chung một chỗ.
// ============================================================================

class RichBankAccount {
    // 1. Dữ liệu bị KHÓA KÍN (private/protected). Kẻ gian bên ngoài không thể can thiệp!
    private id: string;
    private balance: number;
    private status: 'ACTIVE' | 'LOCKED';

    constructor(id: string, initialBalance: number) {
        this.id = id;
        this.balance = initialBalance;
        this.status = 'ACTIVE';
    }

    // 2. Chứa CÁC HÀNH VI ĐẠI DIỆN CHO NGHIỆP VỤ THỰC TẾ (Ubiquitous Language)
    // Tên hàm mô tả đúng nghiệp vụ ngoài đời "Rút tiền (withdraw)", 
    // chứ không phải là tên hàm vô tri như "updateBalance()"
    public withdraw(amount: number): void {
        console.log(`\n[Rich DDD] Yêu cầu rút ${amount} từ tài khoản ${this.id}...`);
        
        // 3. Entity TỰ BẢO VỆ MÌNH. Tự nó kiểm tra các luật lệ kinh doanh (Business Rules).
        if (this.status !== 'ACTIVE') {
            throw new Error("Giao dịch thất bại: Tài khoản đang bị khóa.");
        }
        
        if (amount <= 0) {
            throw new Error("Giao dịch thất bại: Số tiền rút phải lớn hơn 0.");
        }

        if (this.balance < amount) {
            throw new Error("Giao dịch thất bại: Số dư không đủ để thực hiện.");
        }

        // Tự mình cập nhật trạng thái của chính mình
        this.balance -= amount;
        console.log(`[Rich DDD] Rút thành công. Số dư hiện tại: ${this.balance}`);
    }

    // Getter chỉ để đọc, tuyệt đối không có Setter đổi số dư trực tiếp!
    public getBalance(): number {
        return this.balance;
    }
}


// ============================================================================
// THỰC THI (RUN CODE)
// ============================================================================
function run() {
    // --- Test Anemic ---
    const anemicAccount = new AnemicBankAccount("ACC_01", 500);
    const service = new AnemicBankService();
    service.withdraw(anemicAccount, 200);
    // NGỤY BIỆN & LỖI BẢO MẬT DỮ LIỆU: Kẻ gian hack số dư cực dễ
    anemicAccount.balance = 9999999; 
    console.log(`[Anemic Hacked] Tiền bị hack: ${anemicAccount.balance}`);


    // --- Test Rich DDD ---
    const richAccount = new RichBankAccount("ACC_02", 500);
    richAccount.withdraw(200);
    
    // richAccount.balance = 9999999; // DÒNG NÀY SẼ BÁO LỖI BIÊN DỊCH TRONG TYPESCRIPT! (Bảo mật tuyệt đối)
    console.log(`[Rich DDD Checked] Không thể hack, số dư vẫn an toàn: ${richAccount.getBalance()}`);
}

run();
