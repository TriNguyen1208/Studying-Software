import { Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
  private userService = new UserService();

  getUsers = async (req: Request, res: Response) => {
    const users = await this.userService.getAllUsers();
    res.json(users);
  };

  getUserById = async (req: Request, res: Response) => {
    const user = await this.userService.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  };
}
