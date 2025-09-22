import express from 'express';
import multer from 'multer';
import { storage } from '../utils/cloudinaryConfig.js';
import { createRound2Submission, getRound2Submission, checkRound2Submission } from '../controller/round2SubmissionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer with Cloudinary storage
const upload = multer({ storage });

// Routes
router.post('/submit', protect, upload.array('images', 10), createRound2Submission); // Allow up to 10 images
router.get('/checksubmission/:questionId', protect, checkRound2Submission); // Check if submission exists
router.get('/:questionId', protect, getRound2Submission);

export default router;