import { Router } from 'express';
import { MessageController } from './message.controller';

const router = Router();
const controller = new MessageController();

router.post('/', controller.sendMessage);

export { router as messageRouter };
