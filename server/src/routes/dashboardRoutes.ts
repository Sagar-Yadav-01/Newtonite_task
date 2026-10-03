import { Router } from 'express';
import { WorkItemController } from '../controllers/WorkItemController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', WorkItemController.getDashboardSummary);

export default router;
