import { Router } from 'express';

const router = Router();

router.post('/upload', (req, res) => {
  res.json({ url: 'https://cdn.example.com/demo.jpg' });
});

export { router as mediaRouter };
