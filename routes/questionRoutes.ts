import express from 'express';
import {
  addQuestion,
  updateQuestion,
  //checkQuestion,
  getQuestionsByYear,
  getQuestionById
} from '../controller/questionController.js';

const router = express.Router();

router.post('/add', addQuestion);
router.put('/update/:id', updateQuestion);
//router.post('/check/:id', checkQuestion);
router.get('/getQuestion/:year', getQuestionsByYear);
router.get('/question/:id', getQuestionById);

export default router;
