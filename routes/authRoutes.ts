import express from 'express';
import { requestLogin, verifyOTP } from '../controller/authController.js';

const router = express.Router();

router.post('/request-login', requestLogin);
router.post('/verify-otp', verifyOTP);

export default router;
