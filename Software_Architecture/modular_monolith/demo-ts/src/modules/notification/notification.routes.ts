import { Router } from 'express';
// Giả định có controller, để gọn demo mình dùng inline function
const router = Router();
router.get('/', (req, res) => {
  res.json({ message: 'Notifications endpoint' });
});
export { router as notificationRouter };
