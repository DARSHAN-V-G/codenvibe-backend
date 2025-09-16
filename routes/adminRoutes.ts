import express from 'express';
import { addTeam, getAllTeams, removeTeam } from '../controller/adminController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes are protected
router.use(protect);

router.post('/add-team', addTeam);
router.get('/teams', getAllTeams);
router.delete('/remove-team', removeTeam);

export default router;
