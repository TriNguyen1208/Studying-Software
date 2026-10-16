export interface User {
  id: string;
  username: string;
  email: string;
  status: 'online' | 'offline';
  createdAt: Date;
}
