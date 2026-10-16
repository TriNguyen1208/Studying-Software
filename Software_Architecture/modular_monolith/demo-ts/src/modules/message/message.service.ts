import { Message } from './message.entity';
import { ConversationFacade } from '../conversation';
import { NotificationFacade } from '../notification';

const messages: Message[] = [];

export class MessageService {
  private conversationFacade = new ConversationFacade();
  private notificationFacade = new NotificationFacade();

  async sendMessage(senderId: string, conversationId: string, content: string): Promise<Message> {
    // 1. Dùng Facade để check xem User có trong Conversation này không
    const isMember = await this.conversationFacade.verifyMembership(senderId, conversationId);
    if (!isMember) {
      throw new Error('Sender is not a member of this conversation');
    }

    // 2. Lưu tin nhắn
    const message: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId,
      content,
      createdAt: new Date(),
    };
    messages.push(message);

    // 3. (Tuỳ chọn) Gửi notification cho những người khác trong conversation
    // Việc lấy danh sách user trong conversation có thể cung cấp qua ConversationFacade
    // Để giữ demo đơn giản, ta chỉ log gửi thông báo.
    // Thực tế sẽ gọi: this.notificationFacade.notifyUser(receiverId, 'New message!');
    
    return message;
  }
}
