import { Request, Response, NextFunction } from 'express';
import { WorkItemService } from '../services/WorkItemService';
import {
  createWorkItemSchema,
  updateWorkItemSchema,
  assignWorkItemSchema,
  updateStatusSchema,
  queryWorkItemsSchema,
} from '../validators';
import {
  requireTeamMemberOrAdmin,
  authorizeWorkItemAccess,
} from '../middleware/authorize';

export class WorkItemController {
  public static async createWorkItem(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createWorkItemSchema.parse(req.body);
      await requireTeamMemberOrAdmin(req.user!, validated.teamId);
      const workItem = await WorkItemService.createWorkItem(req.user!, validated);
      res.status(201).json(workItem);
    } catch (err) {
      next(err);
    }
  }

  public static async getWorkItems(req: Request, res: Response, next: NextFunction) {
    try {
      const queryParams = queryWorkItemsSchema.parse(req.query);
      const result = await WorkItemService.getWorkItems(req.user!, queryParams);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getWorkItemById(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const item = await WorkItemService.getWorkItemById(workItemId);
      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  }

  public static async updateWorkItem(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const validated = updateWorkItemSchema.parse(req.body);
      const item = await WorkItemService.updateWorkItem(req.user!, workItemId, validated);
      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  }

  public static async assignWorkItem(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const validated = assignWorkItemSchema.parse(req.body);
      const item = await WorkItemService.assignWorkItem(req.user!, workItemId, validated);
      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  }

  public static async unassignWorkItem(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const version = Number(req.body.version);
      const item = await WorkItemService.assignWorkItem(req.user!, workItemId, {
        assigneeId: null,
        version,
      });
      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const validated = updateStatusSchema.parse(req.body);
      const item = await WorkItemService.updateStatus(req.user!, workItemId, validated);
      res.status(200).json(item);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteWorkItem(req: Request, res: Response, next: NextFunction) {
    try {
      const workItemId = req.params.id;
      await authorizeWorkItemAccess(req.user!, workItemId);
      const result = await WorkItemService.archiveWorkItem(req.user!, workItemId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await WorkItemService.getDashboardSummary(req.user!);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  }
}
