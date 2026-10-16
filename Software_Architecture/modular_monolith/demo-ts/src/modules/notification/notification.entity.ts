export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'system';
  content: string;
  isRead: boolean;
  createdAt: Date;
}
