
import type { Request, Response } from 'express';
import Submission from '../models/submission.js';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Question from '../models/question.js';
import SubmissionLog, { SubmissionStatus } from '../models/submissionlog.js';
import axios from 'axios';
dotenv.config();

const COMPILER_URL = process.env.COMPILER_URL;


function decayFactor(tSeconds: number, maxSeconds = 3600, lambda = 0.001) {
	if (tSeconds >= maxSeconds) return 0;
	const expMax = Math.exp(-lambda * maxSeconds);
	return (Math.exp(-lambda * tSeconds) - expMax) / (1 - expMax);
}

function computeScore(
	passedCount: number,
	totalTestcases: number,
	baseScore: number,
	tSeconds: number,
	syntaxErrors: number,
	wrongSubmissions: number
) {
	const factor = decayFactor(tSeconds);

	// Raw score from testcases
	let rawScore = (passedCount / totalTestcases) * baseScore;

	// Apply penalties
	const penalty = (syntaxErrors * 5) + (wrongSubmissions * 10); // tweak weights as needed
	rawScore = Math.max(0, rawScore - penalty);

	// Apply decay factor
	return rawScore * factor;
}



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

		// Check for syntax errors in the results
		const hasSyntaxError = result.results.some((r: any) => {
			const actualOutput = String(r.actualOutput || '');
			return ['SyntaxError', 'NameError', 'TypeError', 'IndentationError'].some(
				errorType => actualOutput.includes(errorType)
			);
		});

		// Calculate score
		const passedCount = result.results.filter((r: any) => r.passed).length;
		// total testcases
		

		// Check if all tests passed
		const allPassed = passedCount === testCases.length;

		// Create submission log entry
		let status: SubmissionStatus;
		if (hasSyntaxError) {
			status = SubmissionStatus.SYNTAX_ERROR;
		} else if (allPassed) {
			status = SubmissionStatus.ACCEPTED;
		} else {
			status = SubmissionStatus.WRONG_SUBMISSION;
		}
		
		await SubmissionLog.create({
			submissionid: submission._id,
			status
		});

		// If already solved, don't update anything except submission record
		if (submission.all_passed) {
			// Just update the code and test cases passed for record keeping
			submission = await Submission.findByIdAndUpdate(
				submission._id,
				{
					code,
					testcases_passed: passedCount
				},
				{ new: true }
			);
			if (!submission) {
				throw new Error('Failed to update submission');
			}
			return res.json({ 
				submissionid: submission._id, 
				passedCount, 
				message: "Question already solved. Score remains unchanged.",
				results: result.results 
			});
		}

		// Only increment wrong_submission if not previously solved
		const shouldIncrementWrong = !allPassed;

		// Update submission and get the updated document
		submission = await Submission.findByIdAndUpdate(
			submission._id,
			{
				testcases_passed: passedCount,
				all_passed: allPassed,
				code,
				$inc: {
					...(hasSyntaxError ? { syntax_error: 1 } : {}),
					...(shouldIncrementWrong ? { wrong_submission: 1 } : {})
				}
			},
			{ new: true }
		);
		if (!submission) {
			throw new Error('Failed to update submission');
		}

		// Only calculate new score if question wasn't previously solved
		let newScore = 0;
		if (!submission.all_passed && allPassed) {
			const totalTestcases = testCases.length;
			const baseScore = 100;
			const elapsedSeconds = Math.floor((Date.now() - submission.created_at.getTime()) / 1000);
			newScore = computeScore(passedCount, totalTestcases, baseScore, elapsedSeconds, submission.syntax_error, submission.wrong_submission);
		}

		// Only update team score if the question wasn't previously solved and is now solved
		if (!submission.all_passed && allPassed) {
			const team = await User.findById(teamid);
			if (team) {
				const qNum = question.number;
				if (typeof qNum === 'number' && qNum > 0) {
					const idx = qNum - 1;

					// Ensure arrays have enough length, padding with zeros if needed
					let testcasesPassedArr = Array.isArray(team.testcases_passed) ? [...team.testcases_passed] : [];
					let testcasesScoreArr = Array.isArray(team.testcases_score) ? [...team.testcases_score] : [];
					
					// Pad arrays with zeros if needed
					while (testcasesPassedArr.length < qNum) {
						testcasesPassedArr.push(0);
					}
					while (testcasesScoreArr.length < qNum) {
						testcasesScoreArr.push(0);
					}

					// Update values at the correct index
					testcasesPassedArr[idx] = Math.max(testcasesPassedArr[idx] ?? 0, passedCount);
					testcasesScoreArr[idx] = Math.max(testcasesScoreArr[idx] ?? 0, newScore);

					// Calculate total score as sum of testcases_score array
					const totalScore = testcasesScoreArr.reduce((sum, score) => sum + (score || 0), 0);

					await User.findByIdAndUpdate(teamid, {
						score: totalScore,
						testcases_passed: testcasesPassedArr,
						testcases_score: testcasesScoreArr
					});
				}
			}
		}

		if (!submission) {
			return res.status(500).json({ error: 'Failed to update submission' });
		}
		res.json({ submissionid: submission._id, passedCount, newScore, results: result.results });
	} catch (error) {
		const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
		res.status(500).json({ error: errMsg });
	}
};
