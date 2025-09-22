import express from 'express';
import {
    submitCode
} from '../controller/submissionController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();
import { round1Middleware,round2Middleware } from '../middleware/roundMiddleware.js';
router.post('/submit', round1Middleware,protect,submitCode);

export default router;
