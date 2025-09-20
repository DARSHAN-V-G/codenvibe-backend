import express from 'express';
import { requestLogin, verifyOTP, logout } from '../controller/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/request-login', requestLogin);
router.post('/verify-otp', verifyOTP);
router.post('/logout', protect, logout);

export default router;
