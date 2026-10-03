import { Request, Response, NextFunction } from 'express';
import { ActivityService } from '../services/ActivityService';
import { authorizeWorkItemAccess } from '../middleware/authorize';

export class ActivityController {
  public static async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const logs = await ActivityService.getActivityLogs(workItemId);
      res.status(200).json(logs);
    } catch (err) {
      next(err);
    }
  }
}
