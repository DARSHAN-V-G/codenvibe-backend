
import type { Request, Response } from 'express';
import Submission from '../models/submission.js';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Question from '../models/question.js';
import SubmissionLog, { SubmissionStatus } from '../models/submissionlog.js';
import axios from 'axios';
import https from 'https';
import { logger } from '../utils/logger.js';
import { broadcastScores } from '../index.js';
dotenv.config();

const COMPILER_URL = process.env.COMPILER_URL;

import { 
  computeScore, 
  checkForSyntaxErrors, 
  determineSubmissionStatus, 
  updateTeamScore, 
  calculatePassedCount,
  type CompilerResponse 
} from '../utils/submissionUtils.js';




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
			const axiosResponse = await axios.post(`${COMPILER_URL}submit-python`, {
				code,
				testCases,
				submissionid: submission._id
			}, {
				  headers: { 'Content-Type': 'application/json' },
				  httpsAgent: new https.Agent({  
					rejectUnauthorized: false // WARNING: This bypasses SSL certificate verification
				  })
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

		// Process results using utility functions
		const hasSyntaxError = checkForSyntaxErrors(result.results);
		console.log("Has syntax error:", hasSyntaxError);
		const passedCount = calculatePassedCount(result.results);
		const allPassed = passedCount === testCases.length;
		const status = determineSubmissionStatus(hasSyntaxError, allPassed);
		
		logger.info('Code execution results', { 
			submissionId: submission._id,
			passedCount,
			totalTests: result.results.length,
			hasSyntaxError,
		});

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

		// Only calculate new score if question wasn't previously solved
		let newScore = 0;
		if (!submission.all_passed) {
			const totalTestcases = testCases.length;
			const elapsedSeconds = Math.floor((Date.now() - submission.created_at.getTime()) / 1000);
			newScore = computeScore(passedCount, totalTestcases, elapsedSeconds, submission.syntax_error, submission.wrong_submission);
		}

		// Only update team score if the question wasn't previously solved

			await updateTeamScore(teamid, question.number, passedCount, newScore);
			// Broadcast updated scores to all connected clients
			await broadcastScores();
			logger.info('Broadcasted updated scores', { 
				teamId: teamid, 
				questionNumber: question.number,
				passedCount,
				newScore 
			});

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

		if (!submission) {
			return res.status(500).json({ error: 'Failed to update submission' });
		}
		res.json({ submissionid: submission._id, passedCount, newScore, results: result.results });
	} catch (error) {
		logger.error('Error while submitting code', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      QuestionId: req.body.questionid,
	  teamId: req.user?.userId
    });
		const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
		res.status(500).json({ error: errMsg });
	}
};
