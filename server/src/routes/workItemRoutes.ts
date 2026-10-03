import { Router } from 'express';
import { WorkItemController } from '../controllers/WorkItemController';
import { CommentController } from '../controllers/CommentController';
import { ActivityController } from '../controllers/ActivityController';
import { authenticate } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router = Router();

router.use(authenticate);

// Work Item CRUD
router.get('/', WorkItemController.getWorkItems);
router.post('/', idempotencyMiddleware, WorkItemController.createWorkItem);
router.get('/:id', WorkItemController.getWorkItemById);
router.patch('/:id', WorkItemController.updateWorkItem);
router.delete('/:id', WorkItemController.deleteWorkItem);

// Work Item Assignment
router.post('/:id/assign', WorkItemController.assignWorkItem);
router.post('/:id/unassign', WorkItemController.unassignWorkItem);

// Workflow Status Transition
router.patch('/:id/status', WorkItemController.updateStatus);

// Comments for a work item
router.get('/:id/comments', CommentController.getComments);
router.post('/:id/comments', CommentController.addComment);

// Activity logs for a work item
router.get('/:id/activity', ActivityController.getActivityLogs);

export default router;
