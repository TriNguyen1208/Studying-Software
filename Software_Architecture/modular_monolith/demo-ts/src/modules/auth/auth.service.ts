import { UserFacade } from '../user';

export class AuthService {
  private userFacade = new UserFacade();

  async login(userId: string) {
    const user = await this.userFacade.getUserInfo(userId);
    if (!user) {
      throw new Error('Invalid credentials (User not found)');
    }
    // Thực tế sẽ check password và generate JWT token
    return { token: `jwt_token_for_${user.id}`, user };
  }
}
