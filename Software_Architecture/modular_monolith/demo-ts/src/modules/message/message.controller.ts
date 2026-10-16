import { Request, Response } from 'express';
import { MessageService } from './message.service';

export class MessageController {
  private messageService = new MessageService();

  sendMessage = async (req: Request, res: Response) => {
    try {
      // Giả sử req.user.id chứa ID người gửi (do middleware auth set)
      const senderId = req.body.senderId || 'u1'; 
      const { conversationId, content } = req.body;

      const message = await this.messageService.sendMessage(senderId, conversationId, content);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(403).json({ message: error.message });
    }
  };
}
