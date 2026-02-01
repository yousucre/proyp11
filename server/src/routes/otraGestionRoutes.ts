import { Router } from 'express';
import * as otraGestionController from '../controllers/otraGestionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, otraGestionController.getRecords);
router.post('/', authenticateToken, otraGestionController.createRecord);
router.put('/:id', authenticateToken, otraGestionController.updateRecord);
router.delete('/:id', authenticateToken, otraGestionController.deleteRecord);

export default router;
