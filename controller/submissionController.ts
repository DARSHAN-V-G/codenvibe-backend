
import type { Request, Response } from 'express';
import Submission from '../models/submission.js';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose'
import Question from '../models/question.js';;
import axios from 'axios';
dotenv.config();

const COMPILER_URL = process.env.COMPILER_URL;




export const submitCode = async (req: Request, res: Response) => {
	try {
		const { code, questionid } = req.body;
        const teamid = req.user?.userId;
		if (!code || !questionid || !teamid) {
			return res.status(400).json({ error: 'Missing required fields.' });
		}

		// Get testCases from Question schema
		const question = await Question.findById(questionid);
		if (!question) {
			return res.status(404).json({ error: 'Question not found.' });
		}
		const testCases = question.test_cases;
		if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
			return res.status(400).json({ error: 'No test cases found for this question.' });
		}


		// Check for existing submission with same teamid and questionid
		let submission = await Submission.findOne({
			teamid: new mongoose.Types.ObjectId(teamid),
			questionid: new mongoose.Types.ObjectId(questionid)
		});
		if (!submission) {
			submission = await Submission.create({
				teamid: new mongoose.Types.ObjectId(teamid),
				questionid: new mongoose.Types.ObjectId(questionid),
				code,
				testcases_passed: 0,
				all_passed: false
			});
		}

		// Send code and testCases to compiler service using axios
		const axiosResponse = await axios.post(`${COMPILER_URL}/submit-python`, {
			code,
			testCases,
			submissionid: submission._id
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
		const result = axiosResponse.data;
		if (!result.results) {
			return res.status(500).json({ error: 'Compiler service error', details: result });
		}

		// Calculate score
		const passedCount = result.results.filter((r: any) => r.passed).length;
		const newScore = passedCount * 10;

		// Update submission
		await Submission.findByIdAndUpdate(submission._id, {
			testcases_passed: passedCount,
			all_passed: passedCount === testCases.length
		});

		// Update team score and testcases_passed
		const team = await User.findById(teamid);
		if (team) {
			const updatedScore = Math.max(team.score, newScore);

			// Update testcases_passed for this question
			let testcasesPassedArr = Array.isArray(team.testcases_passed) ? [...team.testcases_passed] : [];
			const qNum = question.number;
			if (typeof qNum === 'number' && qNum > 0) {
				const idx = qNum - 1;
				const prevVal = testcasesPassedArr[idx] ?? 0;
				testcasesPassedArr[idx] = Math.max(prevVal, passedCount);
			}

			await User.findByIdAndUpdate(teamid, {
				score: updatedScore,
				testcases_passed: testcasesPassedArr
			});
		}

		res.json({ submissionid: submission._id, passedCount, newScore, results: result.results });
	} catch (error) {
		const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
		res.status(500).json({ error: errMsg });
	}
};
