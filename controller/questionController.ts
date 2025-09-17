import type { Request, Response } from 'express';
import Question from '../models/question.js';
import type { IQuestion } from '../models/question.js';

interface IAddQuestionRequest {
  year: number;
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
    const question = await Question.create({ year, correct_code, incorrect_code, test_cases });
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


export const getQuestionsByYear = async (req: Request<{ year: string }>, res: Response) => {
  try {
    const { year } = req.params;
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
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (error) {
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(400).json({ error: errMsg });
  }
};

// Check question code against test cases
// export const checkQuestion = async (req: Request<{ id: string }>, res: Response) => {
//   try {
//     const { id } = req.params;
//     const question = await Question.findById(id);
//     if (!question) return res.status(404).json({ error: 'Question not found' });
//     const { correct_code, test_cases } = question;
//     const results: boolean[] = [];
//     for (const tc of test_cases) {
//       // For security, do NOT use eval in production. Use a sandboxed runner.
//       let output;
//       try {
//         // Simulate code execution (replace with actual runner)
//         // eslint-disable-next-line no-eval
//         output = eval(`(function(input){${correct_code}})(${JSON.stringify(tc.input)})`);
//       } catch (e) {
//         output = typeof e === 'object' && e !== null && 'message' in e ? (e as any).message : String(e);
//       }
//       results.push(output == tc.expectedOutput);
//     }
//     res.json({ passed: results.filter(Boolean).length, total: results.length, results });
//   } catch (error) {
//     const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
//     res.status(400).json({ error: errMsg });
//   }
// };
