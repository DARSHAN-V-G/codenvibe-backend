
import type { Request, Response } from 'express';
import Question from '../models/question.js';
import type { IQuestion } from '../models/question.js';
import User from '../models/userModel.js';
import Submission from '../models/submission.js';
import SubmissionLog from '../models/submissionlog.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export const getQuestionLogs = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user?.userId;
    const questionId = req.params.id;

    logger.info('Fetching question logs', { userId, questionId });

    if (!userId) {
      logger.warn('Unauthenticated question logs access attempt');
      return res.status(400).json({ error: 'User ID not found in request. Make sure you are authenticated.' });
    }

    // First find the submission for this user and question
    const submission = await Submission.findOne({
      teamid: new mongoose.Types.ObjectId(userId),
      questionid: new mongoose.Types.ObjectId(questionId)
    });

    if (!submission) {
      logger.info('No submission found for question', { userId, questionId });
      return res.status(200).json({ message : "No submission founds",logs: []});
    }

    // Get all submission logs for this submission
    const logs = await SubmissionLog.find({
      submissionid: submission._id
    })
    .sort({ createdAt: -1 }) // Sort in reverse chronological order
    .lean(); // Convert to plain JavaScript objects

    logger.info('Question logs retrieved successfully', {
      userId,
      questionId,
      submissionId: submission._id,
      logsCount: logs.length
    });
    res.json({ 
      logs,
      Question_viewded_at: submission.created_at
    });
  } catch (error) {
    logger.error('Error fetching question logs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.userId,
      questionId: req.params.id
    });
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(500).json({ error: errMsg });
  }
};

interface IAddQuestionRequest {
  year: number;
  number : number;
  title: string;
  description: string;
  correct_code: string;
  incorrect_code: string;
  test_cases: Array<{
    input: string;
    expectedOutput: string;
  }>;
}

interface IUpdateQuestionRequest {
  year?: number;
  title?: string;
  description?: string;
  correct_code?: string;
  incorrect_code?: string;
  test_cases?: Array<{
    input: string;
    expectedOutput: string;
  }>;
}

// Get all questions (admin only)
export const getAllQuestions = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all questions');
    const questions = await Question.find();
    logger.info('Questions retrieved successfully', { count: questions.length });
    res.json({ success: true, questions });
  } catch (error) {
    logger.error('Error fetching all questions', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
};

export const addQuestion = async (req: Request<{}, {}, IAddQuestionRequest>, res: Response) => {
  try {
    logger.info('Adding new question', { year: req.body.year });
    const { year, title, description, correct_code, incorrect_code, test_cases } = req.body;
    if (
      typeof year !== 'number' ||
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      typeof correct_code !== 'string' ||
      typeof incorrect_code !== 'string' ||
      !Array.isArray(test_cases) ||
      test_cases.length === 0 ||
      !test_cases.every(tc => typeof tc.input === 'string' && typeof tc.expectedOutput === 'string')
    ) {
      logger.warn('Invalid question data provided', {
        year: typeof year,
        hasTitle: !!title,
        hasDescription: !!description,
        hasCorrectCode: !!correct_code,
        hasIncorrectCode: !!incorrect_code,
        testCasesCount: test_cases?.length
      });
      return res.status(400).json({ error: 'Missing or invalid required fields: year, title, description, correct_code, incorrect_code, test_cases' });
    }

    // Find total number of questions for the same year
    const count = await Question.countDocuments({ year });
    const number = count + 1;

    const question = await Question.create({ 
      year, 
      title,
      description,
      correct_code, 
      incorrect_code, 
      test_cases, 
      number 
    });
    logger.info('Question created successfully', { 
      questionId: question._id,
      year,
      number,
      title,
      testCasesCount: test_cases.length 
    });
    res.status(201).json(question);
  } catch (error) {
    logger.error('Error creating question', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      year: req.body.year
    });
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};


export const updateQuestion = async (req: Request<{ id: string }, {}, IUpdateQuestionRequest>, res: Response) => {
  try {
    const { id } = req.params;
    logger.info('Updating question', { 
      questionId: id,
      updatedFields: Object.keys(req.body)
    });

    const updated = await Question.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      logger.warn('Attempted to update non-existent question', { questionId: id });
      return res.status(404).json({ error: 'Question not found' });
    }
    
    logger.info('Question updated successfully', { 
      questionId: id,
      year: updated.year,
      testCasesCount: updated.test_cases?.length 
    });
    res.json(updated);
  } catch (error) {
    logger.error('Error updating question', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      questionId: req.params.id
    });
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};



export const getQuestions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    logger.info('Fetching questions for user', { userId });

    if (!userId) {
      logger.warn('Unauthenticated question access attempt');
      return res.status(400).json({ error: 'User ID not found in request. Make sure you are authenticated.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn('Question access attempt with invalid user ID', { userId });
      return res.status(404).json({ error: 'User not found.' });
    }

    const year = user.year;
    logger.info('Fetching questions for year', { year, userId });
    
    const questions = await Question.find({ year: Number(year) }, '_id title description');
    logger.info('Questions retrieved successfully', { 
      userId,
      year,
      questionCount: questions.length
    });
    res.json(questions);
  } catch (error) {
    logger.error('Error fetching questions', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.userId
    });
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};




export const getQuestionById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request. Make sure you are authenticated.' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const question = await Question.findById(id);
    if (!question) {
      logger.warn('Question not found', { questionId: id });
      return res.status(404).json({ error: 'Question not found' });
    }
    if (question.year !== user.year) {
      logger.warn('Question access denied - wrong year', { 
        userId,
        questionYear: question.year,
        userYear: user.year 
      });
      return res.status(403).json({ error: 'Access denied. Question is not for your year.' });
    }

    logger.info('User accessing question', { 
      userId,
      questionId: id,
      year: question.year 
    });

    // Check for existing submission or create a new one
    const submission = await Submission.findOne({
      teamid: userId,
      questionid: id
    }) 
    if(!submission){
      const sub = await Submission.create({
      teamid: userId,
      questionid: id,
      code: question.incorrect_code, // Initialize with empty code
      testcases_passed: 0,
      all_passed: false,
      syntax_error: false,
      wrong_submission: false
    });
  }
  question.incorrect_code = submission?.code || question.incorrect_code;
  question.correct_code = ""; // Hide correct code
    res.json({ 
      question
    });
  } catch (error) {
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};


import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const COMPILER_URL = process.env.COMPILER_URL;


export const checkQuestion = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    const { correct_code, test_cases } = question;

    // Send code and testCases to compiler service using axios
    const axiosResponse = await axios.post(`${COMPILER_URL}/submit-python`, {
      code: correct_code,
      testCases: test_cases,
      submissionid: question._id
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    const result = axiosResponse.data;
    if (!result.results) {
      return res.status(500).json({ error: 'Compiler service error', details: result });
    }

    // Calculate passed test cases
    const passedCount = result.results.filter((r: any) => r.passed).length;
    res.json({ passed: passedCount, total: result.results.length, results: result.results });
  } catch (error) {
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};
