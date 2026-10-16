/**
 * File: answers-onion-architecture.ts
 * ĐÁP ÁN BÀI TẬP THỰC HÀNH ONION ARCHITECTURE
 * 
 * Yêu cầu: Thêm tính năng gửi Email báo cấu hình khi User đăng ký thành công.
 * Áp dụng đúng quy tắc Củ hành: Lớp Application không được dính dáng tới thư viện Gửi mail (Nodemailer, SendGrid...).
 */

// ============================================================================
// BƯỚC 1: ĐỊNH NGHĨA INTERFACE Ở LỚP APPLICATION (LỚP SỐ 3)
// Lớp 3 nói: "Tôi cần một dịch vụ gửi email, tôi định nghĩa luật (Interface) ở đây. 
// Ai (Lớp vỏ) muốn làm dịch vụ này thì làm theo luật của tôi."
// ============================================================================
interface IEmailNotificationService {
    sendWelcomeEmail(emailAddress: string, username: string): Promise<void>;
}


// ============================================================================
// BƯỚC 2: CẬP NHẬT LỚP APPLICATION SERVICE (LỚP SỐ 3)
// Sử dụng Interface vừa tạo mà không cần biết thư viện thực tế là gì.
// ============================================================================
class UserApplicationService {
    // Tiêm (Inject) thêm IEmailNotificationService vào constructor
    constructor(
        private userRepository: any, // IUserRepository
        private emailService: IEmailNotificationService // Thêm dòng này
    ) {}

    public async registerUser(req: any): Promise<string> {
        // ... (Logic kiểm tra và lưu user giữ nguyên như cũ)
        console.log(`[Lớp Application] Đã lưu User ${req.username} vào cơ sở dữ liệu.`);
        
        // Gọi hành động gửi mail qua Interface.
        // Lớp Application hoàn toàn KHÔNG phụ thuộc vào thư viện Mail ngoài.
        await this.emailService.sendWelcomeEmail(req.email, req.username);

        return "new-user-id-123";
    }
}


// ============================================================================
// BƯỚC 3: THỰC THI INTERFACE Ở LỚP INFRASTRUCTURE (LỚP SỐ 4 - VỎ NGOÀI CÙNG)
// Đây là nơi chứa code thật sự gọi API bên ngoài (ví dụ gọi SendGrid hoặc AWS SES).
// Lớp vỏ này phụ thuộc (implement) cái Interface do Lớp 3 ở trên cung cấp.
// ============================================================================
class SendGridEmailAdapter implements IEmailNotificationService {
    async sendWelcomeEmail(emailAddress: string, username: string): Promise<void> {
        console.log(`[Lớp Infrastructure - Email] Kết nối tới hệ thống SendGrid...`);
        console.log(`[Lớp Infrastructure - Email] Đang gửi mail chào mừng tới <${emailAddress}>...`);
        // Thực tế sẽ dùng: await sendgrid.send({ to: emailAddress, text: 'Welcome!' })
        console.log(`[Lớp Infrastructure - Email] Đã gửi thành công!`);
    }
}


// ============================================================================
// BƯỚC 4: LẮP RÁP KHI KHỞI ĐỘNG HỆ THỐNG (WIRING)
// ============================================================================
async function bootSystem() {
    // 1. Tạo các Adapter hạ tầng (Lớp Vỏ 4)
    const userRepository = {}; // (Giả lập DB Repository)
    const emailAdapter = new SendGridEmailAdapter(); // Adapter thực tế gửi mail
    
    // 2. Bơm toàn bộ hạ tầng vào Lõi Ứng dụng (Lớp 3)
    const appService = new UserApplicationService(userRepository, emailAdapter);
    
    // 3. Thực thi nghiệp vụ
    await appService.registerUser({ username: "alice", email: "alice@example.com" });
}

// Output mong đợi khi chạy:
// [Lớp Application] Đã lưu User alice vào cơ sở dữ liệu.
// [Lớp Infrastructure - Email] Kết nối tới hệ thống SendGrid...
// [Lớp Infrastructure - Email] Đang gửi mail chào mừng tới <alice@example.com>...
// [Lớp Infrastructure - Email] Đã gửi thành công!
