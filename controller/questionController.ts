
import type { Request, Response } from 'express';
import Question from '../models/question.js';
import type { IQuestion } from '../models/question.js';
import User from '../models/userModel.js';

interface IAddQuestionRequest {
  year: number;
  number : number;
  correct_code: string;
  incorrect_code: string;
  test_cases: Array<{
    input: string;
    expectedOutput: string;
  }>;
}

interface IUpdateQuestionRequest {
  year?: number;
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
    const questions = await Question.find();
    res.json({ success: true, questions });
  } catch (error) {
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
};

export const addQuestion = async (req: Request<{}, {}, IAddQuestionRequest>, res: Response) => {
  try {
    const { year, correct_code, incorrect_code, test_cases } = req.body;
    if (
      typeof year !== 'number' ||
      typeof correct_code !== 'string' ||
      typeof incorrect_code !== 'string' ||
      !Array.isArray(test_cases) ||
      test_cases.length === 0 ||
      !test_cases.every(tc => typeof tc.input === 'string' && typeof tc.expectedOutput === 'string')
    ) {
      return res.status(400).json({ error: 'Missing or invalid required fields: year, correct_code, incorrect_code, test_cases' });
    }

    // Find total number of questions for the same year
    const count = await Question.countDocuments({ year });
    const number = count + 1;

    const question = await Question.create({ year, correct_code, incorrect_code, test_cases, number });
    res.status(201).json(question);
  } catch (error) {
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};


export const updateQuestion = async (req: Request<{ id: string }, {}, IUpdateQuestionRequest>, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await Question.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Question not found' });
    res.json(updated);
  } catch (error) {
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};



export const getQuestions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in request. Make sure you are authenticated.' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const year = user.year;
    const questions = await Question.find({ year: Number(year) }, '_id');
    res.json(questions);
  } catch (error) {
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
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.year !== user.year) {
      return res.status(403).json({ error: 'Access denied. Question is not for your year.' });
    }
    res.json(question);
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
