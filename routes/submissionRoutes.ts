import express from 'express';
import {
    submitCode
} from '../controller/submissionController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/submit', protect,submitCode);

export default router;
