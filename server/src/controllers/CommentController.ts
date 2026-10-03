import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/CommentService';
import { createCommentSchema, updateCommentSchema } from '../validators';
import { authorizeWorkItemAccess } from '../middleware/authorize';

export class CommentController {
  public static async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const comments = await CommentService.getComments(workItemId);
      res.status(200).json(comments);
    } catch (err) {
      next(err);
    }
  }

  public static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const validated = createCommentSchema.parse(req.body);
      const comment = await CommentService.addComment(req.user!, workItemId, validated.content);
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }

  public static async updateComment(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.id;
      const validated = updateCommentSchema.parse(req.body);
      const updated = await CommentService.updateComment(req.user!, commentId, validated.content);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.id;
      const result = await CommentService.deleteComment(req.user!, commentId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
