import { Router } from 'express';
import { CommentController } from '../controllers/CommentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.patch('/:id', CommentController.updateComment);
router.delete('/:id', CommentController.deleteComment);

export default router;
