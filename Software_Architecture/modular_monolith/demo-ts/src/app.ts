import express from 'express';
import { userRouter } from './modules/user';
import { authRouter } from './modules/auth';
import { messageRouter } from './modules/message';
import { conversationRouter } from './modules/conversation';
import { mediaRouter } from './modules/media';
import { notificationRouter } from './modules/notification';

const app = express();

app.use(express.json());

// Đăng ký routes của các modules
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/messages', messageRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/media', mediaRouter);
app.use('/api/notifications', notificationRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

export { app };
