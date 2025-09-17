import express from 'express';
import {
  addQuestion,
  updateQuestion,
  checkQuestion,
  getQuestions,
  getQuestionById
} from '../controller/questionController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/add',addQuestion);
router.put('/update/:id', updateQuestion);
router.post('/check/:id', checkQuestion);
router.get('/getQuestion', protect,getQuestions);
router.get('/question/:id', protect,getQuestionById);

export default router;
