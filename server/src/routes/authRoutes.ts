import { Router } from 'express';
import { login, setup, forgotPassword, verifyToken, resetPassword } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/setup', setup);
router.post('/forgot-password', forgotPassword);
router.post('/verify-token', verifyToken);
router.post('/reset-password', resetPassword);

export default router;
