import express from 'express';
import {
  addQuestion,
  updateQuestion,
  checkQuestion,
  getQuestions,
  getQuestionById,
  getAllQuestions,
  getQuestionLogs,
  getAllRound2Questions
} from '../controller/questionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminProtect } from '../middleware/adminMiddleware.js';
import { round1Middleware,round2Middleware } from '../middleware/roundMiddleware.js';
const router = express.Router();
router.get('/all', adminProtect, getAllQuestions);
router.get('/round2', round2Middleware,protect, getAllRound2Questions);  // New route for round 2 questions
router.post('/add', addQuestion);
router.put('/update/:id', updateQuestion);
router.post('/check/:id', checkQuestion);
router.get('/logs/:id',round1Middleware,protect,getQuestionLogs);
router.get('/getQuestion', round1Middleware,protect,getQuestions);
router.get('/question/:id', round1Middleware,protect,getQuestionById);

export default router;
