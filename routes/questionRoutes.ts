import express from 'express';
import {
  addQuestion,
  updateQuestion,
  checkQuestion,
  getQuestions,
  getQuestionById,
  getAllQuestions
} from '../controller/questionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminProtect } from 'middleware/adminMiddleware.js';
const router = express.Router();
router.get('/all',adminProtect,getAllQuestions);
router.post('/add',addQuestion);
router.put('/update/:id', updateQuestion);
router.post('/check/:id', checkQuestion);
router.get('/getQuestion', protect,getQuestions);
router.get('/question/:id', protect,getQuestionById);

export default router;
