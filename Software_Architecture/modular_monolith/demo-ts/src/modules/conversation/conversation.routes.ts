import { Router } from 'express';
import { ConversationController } from './conversation.controller';

const router = Router();
const controller = new ConversationController();

router.post('/', controller.createConversation);
router.get('/:id', controller.getConversation);

export { router as conversationRouter };
