import { UserService } from './user.service';
import { User } from './user.entity';

// Facade là nơi duy nhất expose function cho các module khác gọi đến.
export class UserFacade {
  private userService = new UserService();

  // Expose những methods cần thiết cho các module khác
  async getUserInfo(userId: string): Promise<User | null> {
    return this.userService.getUserById(userId);
  }

  async checkUsersExist(userIds: string[]): Promise<boolean> {
    for (const id of userIds) {
      const user = await this.userService.getUserById(id);
      if (!user) return false;
    }
    return true;
  }
}
