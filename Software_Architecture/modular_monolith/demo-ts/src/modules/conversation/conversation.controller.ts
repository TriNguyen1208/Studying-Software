import { Request, Response } from 'express';
import { ConversationService } from './conversation.service';

export class ConversationController {
  private conversationService = new ConversationService();

  createConversation = async (req: Request, res: Response) => {
    try {
      const { memberIds, type, name } = req.body;
      const conversation = await this.conversationService.createConversation(memberIds, type, name);
      res.status(201).json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getConversation = async (req: Request, res: Response) => {
    const conversation = await this.conversationService.getConversationById(req.params.id);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  };
}
