import express from 'express';
import { addTeam, getAllTeams, removeTeam } from '../controller/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getLogs } from '../controller/logController.js';
const router = express.Router();

// All admin routes are protected

router.post('/add-team', addTeam);
router.get('/teams', getAllTeams);
//router.delete('/remove-team', removeTeam);
router.get("/logs",getLogs)

export default router;
