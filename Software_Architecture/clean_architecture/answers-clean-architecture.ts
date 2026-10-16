/**
 * =========================================================
 * ĐÁP ÁN BÀI TẬP: CẬP NHẬT TÊN NGƯỜI DÙNG TRONG CLEAN ARCHITECTURE
 * =========================================================
 * Yêu cầu: Viết Use Case mới để thay đổi tên của User.
 * 
 * Lưu ý: Entity `User` trong demo đang dùng readonly properties (để minh họa immutable object).
 * Do đó, ta sẽ viết thêm phương thức `changeName` trả về 1 instance User mới trong lớp Entity.
 */

import { User, UserRepository } from "./demo-clean-architecture";

// ==========================================
// BỔ SUNG LỚP 1: ENTITIES (Mở rộng tính năng)
// ==========================================
// Giả định User entity có thêm phương thức clone with new name:
// class User {
//   ...
//   changeName(newName: string): User {
//     if(newName.trim().length === 0) throw new Error("Tên không được rỗng");
//     return new User(this.id, this.email, newName);
//   }
// }

// ==========================================
// LỚP 2: USE CASES
// ==========================================
// DTO đầu vào
export interface UpdateUserNameRequestDTO {
  userId: string;
  newName: string;
}

// DTO kết quả
export interface UpdateUserNameResponseDTO {
  success: boolean;
  message: string;
}

// Bổ sung interface của UserRepository
export interface UserRepositoryExtended extends UserRepository {
  findById(id: string): Promise<User | null>;
  update(user: User): Promise<void>;
}

// Use Case
export class UpdateUserNameUseCase {
  constructor(private readonly userRepository: UserRepositoryExtended) {}

  async execute(request: UpdateUserNameRequestDTO): Promise<UpdateUserNameResponseDTO> {
    // 1. Kiểm tra đầu vào hợp lệ ở mức cơ bản
    if (!request.newName || request.newName.trim().length === 0) {
      return { success: false, message: 'Tên mới không được để trống.' };
    }

    // 2. Lấy dữ liệu qua interface Repository
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      return { success: false, message: 'Không tìm thấy người dùng.' };
    }

    // 3. Thực hiện thay đổi (Nếu User là Entity immutable, ta tạo 1 bản copy)
    const updatedUser = new User(user.id, user.email, request.newName);

    // 4. Lưu lại thông qua Repository
    await this.userRepository.update(updatedUser);

    return { success: true, message: 'Cập nhật tên thành công.' };
  }
}
