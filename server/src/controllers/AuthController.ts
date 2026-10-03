import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { registerSchema, loginSchema } from '../validators';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response) {
    res.status(200).json({ message: 'Logged out successfully' });
  }

  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getUserById(req.user!.id);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }

  public static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await AuthService.getAllUsers();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }

  public static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getUserById(req.params.id);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  }

  public static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await AuthService.updateUser(req.params.id, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
