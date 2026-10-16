import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private authService = new AuthService();

  login = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const result = await this.authService.login(userId);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  };
}
