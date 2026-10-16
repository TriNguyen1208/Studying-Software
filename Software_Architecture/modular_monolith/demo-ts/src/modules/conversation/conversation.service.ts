import { Conversation } from './conversation.entity';
import { UserFacade } from '../user';

const conversations: Conversation[] = [];

export class ConversationService {
  private userFacade = new UserFacade(); // Gọi module khác thông qua Facade

  async createConversation(memberIds: string[], type: 'private' | 'group', name?: string): Promise<Conversation> {
    // Gọi UserFacade để kiểm tra các user này có tồn tại không
    const usersExist = await this.userFacade.checkUsersExist(memberIds);
    if (!usersExist) {
      throw new Error('One or more users do not exist');
    }

    const conversation: Conversation = {
      id: `conv_${Date.now()}`,
      memberIds,
      type,
      name: name || null,
      createdAt: new Date(),
    };
    
    conversations.push(conversation);
    return conversation;
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return conversations.find(c => c.id === id) || null;
  }

  async isUserInConversation(userId: string, conversationId: string): Promise<boolean> {
    const conv = await this.getConversationById(conversationId);
    return conv ? conv.memberIds.includes(userId) : false;
  }
}
