import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { registerSchema, loginSchema, updateUserSchema } from '../validators';
import { ForbiddenError } from '../utils/errors';

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
      if ('role' in req.body && req.user?.role !== 'ADMIN') {
        throw ForbiddenError('Changing user role is forbidden.');
      }
      if (req.user?.role !== 'ADMIN' && req.user?.id !== req.params.id) {
        throw ForbiddenError("You don't have permission to update another user's profile.");
      }
      const validated = updateUserSchema.parse(req.body);
      const updated = await AuthService.updateUser(req.params.id, validated);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
