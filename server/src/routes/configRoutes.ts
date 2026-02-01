import { Router } from 'express';
import * as configController from '../controllers/configController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/tipos-actividad', authenticateToken, configController.getTiposActividad);
router.post('/tipos-actividad', authenticateToken, configController.createTipoActividad);
router.put('/tipos-actividad/:id', authenticateToken, configController.updateTipoActividad);
router.delete('/tipos-actividad/:id', authenticateToken, configController.deleteTipoActividad);
router.get('/tipos-expediente', authenticateToken, configController.getTiposExpediente);
router.get('/system', authenticateToken, configController.getConfig);
router.put('/system', authenticateToken, configController.updateSystemConfig);

export default router;
