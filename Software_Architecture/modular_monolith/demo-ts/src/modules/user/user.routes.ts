import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();
const controller = new UserController();

router.get('/', controller.getUsers);
router.get('/:id', controller.getUserById);

export { router as userRouter };
