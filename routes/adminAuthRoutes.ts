import express from 'express';
import { registerAdmin, loginAdmin, logoutAdmin } from '../controller/adminAuthController.js';

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

export default router;
