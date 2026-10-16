import { ConversationService } from './conversation.service';

export class ConversationFacade {
  private conversationService = new ConversationService();

  async verifyMembership(userId: string, conversationId: string): Promise<boolean> {
    return this.conversationService.isUserInConversation(userId, conversationId);
  }
}
