import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticateToken, dashboardController.getStats);
router.get('/pending', authenticateToken, dashboardController.getPendingPQRs);
router.get('/notes', authenticateToken, dashboardController.getQuickNotes);
router.post('/notes', authenticateToken, dashboardController.addQuickNote);
router.put('/notes/:id', authenticateToken, dashboardController.updateQuickNote);
router.delete('/notes/:id', authenticateToken, dashboardController.deleteQuickNote);
router.post('/notes/reorder', authenticateToken, dashboardController.updateNotesOrder);

export default router;
