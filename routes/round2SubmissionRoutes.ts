import express from 'express';
import multer from 'multer';
import { storage } from '../utils/cloudinaryConfig.js';
import { createRound2Submission, getRound2Submission, checkRound2Submission } from '../controller/round2SubmissionController.js';
import { adminProtect } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Configure multer with Cloudinary storage
const upload = multer({ storage });

// Routes
router.post('/submit',  upload.array('images', 10), createRound2Submission); // Allow up to 10 images
router.get('/checksubmission/:questionId', checkRound2Submission); // Check if submission exists
router.get('/:questionId', adminProtect, getRound2Submission);

export default router;