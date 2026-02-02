import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticateToken, reportController.getReportStats);
router.get('/by-period', authenticateToken, reportController.getPQRsByPeriod);
router.get('/general', authenticateToken, reportController.getGeneralReportData);
router.get('/otras', authenticateToken, reportController.getOtrasGestionesReport);
router.get('/otras/by-period', authenticateToken, reportController.getOtrasReportByPeriod);

export default router;
