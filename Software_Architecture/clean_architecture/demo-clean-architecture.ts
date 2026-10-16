/**
 * =========================================================
 * DEMO CLEAN ARCHITECTURE: TẠO MỚI NGƯỜI DÙNG (USER)
 * =========================================================
 * 
 * Mã nguồn này minh họa một luồng tạo User cơ bản áp dụng Clean Architecture.
 * Các lớp (Layers) được tổ chức từ trong ra ngoài:
 * 1. Enterprise Business Rules (Entities)
 * 2. Application Business Rules (Use Cases)
 * 3. Interface Adapters (Controllers, Repositories)
 * 4. Frameworks & Drivers (Database, Web Framework - mô phỏng)
 */

// ==========================================
// LỚP 1: ENTITIES (Enterprise Business Rules)
// ==========================================
// Entity đại diện cho các object cốt lõi của domain, chứa logic nghiệp vụ cốt lõi không thay đổi.

// Định nghĩa cấu trúc của một User
export class User {
  constructor(
    public readonly id: string,      // ID của người dùng (chỉ đọc)
    public readonly email: string,   // Email của người dùng
    public readonly name: string     // Tên của người dùng
  ) {}

  // Phương thức nghiệp vụ cốt lõi: kiểm tra email có hợp lệ không
  // Bất kể hệ thống chạy trên Web hay Mobile, email vẫn phải chứa ký tự '@'.
  isValidEmail(): boolean {
    return this.email.includes('@');
  }
}

// ==========================================
// LỚP 2: USE CASES (Application Business Rules)
// ==========================================
// Chứa logic nghiệp vụ đặc thù của ứng dụng, phối hợp các Entity để thực hiện tác vụ.

// Data Transfer Object (DTO) nhận đầu vào cho Use Case tạo user.
export interface CreateUserRequestDTO {
  email: string;
  name: string;
}

// DTO trả về kết quả cho Use Case.
export interface CreateUserResponseDTO {
  success: boolean;
  message: string;
  userId?: string;
}

// Interface (Port) định nghĩa các hành động mà Use Case cần ở Repository (Inversion of Control).
// Use Case không quan tâm Repository lưu vào SQL, NoSQL hay File.
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Lớp Use Case xử lý tác vụ "Tạo người dùng mới"
export class CreateUserUseCase {
  // Dependency Injection: truyền Repository thông qua interface (Port).
  constructor(private readonly userRepository: UserRepository) {}

  // Hàm thực thi luồng logic chính của Use Case
  async execute(request: CreateUserRequestDTO): Promise<CreateUserResponseDTO> {
    // 1. Kiểm tra email đã tồn tại trong hệ thống chưa thông qua port (interface)
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      // Trả về lỗi nếu email đã tồn tại
      return { success: false, message: 'Email đã được sử dụng.' };
    }

    // 2. Khởi tạo Entity (User) với một ID sinh ngẫu nhiên (giả lập bằng Date)
    const newUserId = `USER_${Date.now()}`;
    const user = new User(newUserId, request.email, request.name);

    // 3. Kiểm tra logic nghiệp vụ từ Entity (Email có hợp lệ không?)
    if (!user.isValidEmail()) {
      return { success: false, message: 'Định dạng email không hợp lệ.' };
    }

    // 4. Lưu Entity xuống qua Repository (Adapter)
    await this.userRepository.save(user);

    // 5. Trả về kết quả thành công
    return { success: true, message: 'Tạo tài khoản thành công.', userId: user.id };
  }
}

// ==========================================
// LỚP 3: INTERFACE ADAPTERS (Controllers & Gateways)
// ==========================================
// Nơi chuyển đổi dữ liệu từ format thân thiện với UseCase sang format của thế giới bên ngoài (Web/Database).

// Controller: Nhận HTTP request, biến nó thành request cho UseCase, và trả về HTTP response.
export class UserController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  // Giả lập hàm xử lý request từ một Web Framework (như Express.js)
  async createUser(reqBody: any): Promise<{ statusCode: number, body: any }> {
    try {
      // Chuẩn bị DTO đầu vào cho Use Case
      const requestDto: CreateUserRequestDTO = {
        email: reqBody.email,
        name: reqBody.name
      };

      // Gọi Use Case thực thi logic
      const result = await this.createUserUseCase.execute(requestDto);

      // Chuyển đổi kết quả Use Case thành dạng HTTP Response
      if (result.success) {
        return { statusCode: 201, body: result }; // 201 Created
      } else {
        return { statusCode: 400, body: result }; // 400 Bad Request
      }
    } catch (error) {
      // Xử lý lỗi hệ thống chưa biết tới
      return { statusCode: 500, body: { message: 'Lỗi hệ thống.' } }; // 500 Internal Server Error
    }
  }
}

// ==========================================
// LỚP 4: FRAMEWORKS & DRIVERS (Implementation)
// ==========================================
// Cài đặt thực tế của các Interface Adapter (cơ sở dữ liệu, framework).

// Cài đặt UserRepository giả lập sử dụng In-Memory Array (thay vì kết nối DB thật).
export class InMemoryUserRepository implements UserRepository {
  private users: User[] = []; // Mảng chứa dữ liệu

  // Cài đặt hàm tìm kiếm User bằng email
  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find(u => u.email === email);
    return user || null;
  }

  // Cài đặt hàm lưu trữ User
  async save(user: User): Promise<void> {
    this.users.push(user);
    console.log(`[DB] Đã lưu user: ${user.name} (${user.email})`);
  }
}

// --- KHỞI CHẠY ỨNG DỤNG ---
// Composition Root: Nơi khởi tạo và lắp ráp các thành phần lại với nhau.
async function runDemo() {
  // Khởi tạo implementation của Repository
  const repository = new InMemoryUserRepository();
  
  // Tiêm (Inject) repository vào Use Case
  const useCase = new CreateUserUseCase(repository);
  
  // Tiêm (Inject) use case vào Controller
  const controller = new UserController(useCase);

  console.log("--- Bắt đầu Test Case 1: Đăng ký thành công ---");
  const response1 = await controller.createUser({ email: "test@example.com", name: "Nguyễn Văn A" });
  console.log("Response 1:", response1);

  console.log("\n--- Bắt đầu Test Case 2: Trùng email ---");
  const response2 = await controller.createUser({ email: "test@example.com", name: "Nguyễn Văn B" });
  console.log("Response 2:", response2);

  console.log("\n--- Bắt đầu Test Case 3: Email không hợp lệ ---");
  const response3 = await controller.createUser({ email: "invalid-email", name: "Trần C" });
  console.log("Response 3:", response3);
}

// runDemo();
