import { Router } from 'express';
import { getPQRs, getPQRById, createPQR, updatePQR, deletePQR, createActuacion } from '../controllers/pqrController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken); // Protect all routes

router.get('/', getPQRs);
router.get('/:id', getPQRById);
router.post('/', createPQR);
router.put('/:id', updatePQR);
router.delete('/:id', deletePQR);
router.post('/:id/actuacion', createActuacion);

export default router;
