import express from 'express';
import { 
  addTeam, 
  getAllTeams, 
  removeTeam, 
  addRound2Question,
  getRound2QuestionSubmissions,
  updateCurrentRound
} from '../controller/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getLogs } from '../controller/logController.js';
import { getAllRound2Questions } from '../controller/questionController.js';

const router = express.Router();

// All admin routes are protected
router.post('/add-team', addTeam);
router.get('/teams', getAllTeams);
router.post('/round2-question', addRound2Question);
router.get('/getround2-questions', protect, getAllRound2Questions);
router.get('/getround2-submission/:questionid', protect, getRound2QuestionSubmissions);
router.post('/update-round', protect, updateCurrentRound);  // New route to update current round // New route to get current round
//router.delete('/remove-team', removeTeam);
router.get('/logs', getLogs);

router.post('/add-team', addTeam);
router.get('/teams', getAllTeams);
router.post('/round2-question', addRound2Question);
router.get('/getround2-questions', protect, getAllRound2Questions);
router.get('/getround2-submission/:questionid', protect, getRound2QuestionSubmissions);
//router.delete('/remove-team', removeTeam);
router.get("/logs",getLogs)

export default router;
