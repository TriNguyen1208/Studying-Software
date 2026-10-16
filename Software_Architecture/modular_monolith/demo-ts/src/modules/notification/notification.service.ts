import { Notification } from './notification.entity';

const notifications: Notification[] = [];

export class NotificationService {
  async sendNotification(userId: string, content: string, type: 'message' | 'system'): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}`,
      userId,
      type,
      content,
      isRead: false,
      createdAt: new Date(),
    };
    notifications.push(notification);
    
    // Ở hệ thống thật, đoạn này sẽ đẩy qua Socket.IO hoặc FCM để báo cho user
    console.log(`[Notification] To User ${userId}: ${content}`);
    
    return notification;
  }
}
