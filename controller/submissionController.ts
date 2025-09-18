
import type { Request, Response } from 'express';
import Submission from '../models/submission.js';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Question from '../models/question.js';
import SubmissionLog, { SubmissionStatus } from '../models/submissionlog.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';
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
		logger.info('Code submission received', { 
			teamId: teamid,
			questionId: questionid,
			codeLength: code?.length
		});

		if (!code || !questionid || !teamid) {
			logger.warn('Invalid submission request', {
				hasCode: !!code,
				hasQuestionId: !!questionid,
				hasTeamId: !!teamid
			});
			return res.status(400).json({ error: 'Missing required fields.' });
		}

		// Get testCases from Question schema
		const question = await Question.findById(questionid);
		if (!question) {
			logger.warn('Submission attempt for non-existent question', { 
				questionId: questionid,
				teamId: teamid
			});
			return res.status(404).json({ error: 'Question not found.' });
		}
		logger.info('Question found for submission', { 
			questionId: questionid,
			year: question.year,
			number: question.number
		});

		const testCases = question.test_cases;
		if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
			logger.error('Question found without valid test cases', { 
				questionId: questionid,
				testCasesExists: !!testCases,
				isArray: Array.isArray(testCases),
				count: testCases?.length
			});
			return res.status(400).json({ error: 'No test cases found for this question.' });
		}


		// Check for existing submission with same teamid and questionid
		let submission = await Submission.findOne({
			teamid: new mongoose.Types.ObjectId(teamid),
			questionid: new mongoose.Types.ObjectId(questionid)
		});

		if (!submission) {
			logger.info('Creating new submission record', { 
				teamId: teamid,
				questionId: questionid
			});
			submission = await Submission.create({
				teamid: new mongoose.Types.ObjectId(teamid),
				questionid: new mongoose.Types.ObjectId(questionid),
				code,
				testcases_passed: 0,
				all_passed: false
			});
		} else {
			logger.info('Found existing submission record', { 
				submissionId: submission._id,
				previousTestsPassed: submission.testcases_passed,
				wasAllPassed: submission.all_passed
			});
		}

		// Send code and testCases to compiler service using axios
		logger.info('Sending code to compiler service', { 
			submissionId: submission._id,
			testCasesCount: testCases.length,
			compilerUrl: COMPILER_URL
		});

		let result;
		try {
			const axiosResponse = await axios.post(`${COMPILER_URL}/submit-python`, {
				code,
				testCases,
				submissionid: submission._id
			}, {
				headers: { 'Content-Type': 'application/json' }
			});
			result = axiosResponse.data;
		} catch (compilerError) {
			logger.error('Compiler service communication error', {
				error: compilerError instanceof Error ? compilerError.message : 'Unknown error',
				submissionId: submission._id,
				compilerUrl: COMPILER_URL
			});
			throw compilerError;
		}

		if (!result.results) {
			logger.error('Invalid compiler service response', { 
				submissionId: submission._id,
				response: result
			});
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
		
		logger.info('Code execution results', { 
			submissionId: submission._id,
			passedCount,
			totalTests: result.results.length,
			hasSyntaxError,
		});
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
		
		logger.info('Creating submission log entry', {
			submissionId: submission._id,
			status,
			passedCount,
			totalTests: testCases.length,
			hasSyntaxError
		});

		await SubmissionLog.create({
			submissionid: submission._id,
			status
		});

		// If already solved, don't update anything except submission record
		if (submission.all_passed) {
			logger.info('Updating previously solved submission', {
				submissionId: submission._id,
				newPassedCount: passedCount,
				previouslyPassed: submission.testcases_passed
			});

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
				logger.error('Failed to update existing submission', {
					teamId: teamid,
					questionId: questionid
				});
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
		logger.info('Processing new submission result', {
			submissionId: submission._id,
			allPassed,
			shouldIncrementWrong,
			passedCount
		});

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
