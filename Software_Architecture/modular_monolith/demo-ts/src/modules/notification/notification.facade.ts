import { NotificationService } from './notification.service';

export class NotificationFacade {
  private notificationService = new NotificationService();

  async notifyUser(userId: string, content: string): Promise<void> {
    await this.notificationService.sendNotification(userId, content, 'message');
  }
}
