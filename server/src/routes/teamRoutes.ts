import { Router } from 'express';
import { TeamController } from '../controllers/TeamController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', TeamController.getAllTeams);
router.post('/', TeamController.createTeam);
router.get('/:id', TeamController.getTeamById);
router.patch('/:id', TeamController.updateTeam);
router.get('/:id/members', TeamController.getTeamMembers);
router.post('/:id/members', TeamController.addTeamMember);
router.delete('/:id/members/:userId', TeamController.removeTeamMember);

export default router;
