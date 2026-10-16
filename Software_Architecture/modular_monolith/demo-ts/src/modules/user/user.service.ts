import { User } from './user.entity';

// Giả lập DB
const users: User[] = [
  { id: 'u1', username: 'alice', email: 'alice@example.com', status: 'online', createdAt: new Date() },
  { id: 'u2', username: 'bob', email: 'bob@example.com', status: 'offline', createdAt: new Date() }
];

export class UserService {
  async getUserById(id: string): Promise<User | null> {
    return users.find(u => u.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return users;
  }
}
