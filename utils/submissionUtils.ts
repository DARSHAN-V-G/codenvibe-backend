import { Types } from 'mongoose';
import { SubmissionStatus } from '../models/submissionlog.js';
import User from '../models/userModel.js';
import { logger } from './logger.js';

interface TestResult {
  passed: boolean;
  actualOutput?: string;
}

export interface CompilerResponse {
  results: TestResult[];
}

export function checkForSyntaxErrors(results: TestResult[]): boolean {
  const errorTypes = ['SyntaxError', 'NameError', 'TypeError', 'IndentationError'];
  return results.some(r => {
    const actualOutput = String(r.actualOutput || '');
    return errorTypes.some(errorType => actualOutput.includes(errorType));
  });
}

export function determineSubmissionStatus(hasSyntaxError: boolean, allPassed: boolean): SubmissionStatus {
  if (hasSyntaxError) return SubmissionStatus.SYNTAX_ERROR;
  if (allPassed) return SubmissionStatus.ACCEPTED;
  return SubmissionStatus.WRONG_SUBMISSION;
}

export function computeScore(
  passedCount: number,
  totalTestcases: number,
  tSeconds: number,
  syntaxErrors: number,
  wrongSubmissions: number
) {
  // --- Weights ---
  const BASE = 5;
  const TIME_MAX = 8;
  const SYNTAX_MAX = 10;
  const WRONG_MAX = 7;

  // --- Limits ---
  const MAX_TIME = 45 * 60; // 45 mins in seconds
  const MAX_SYNTAX = 30;
  const MAX_WRONG = 30;

  // --- Time contribution (linear decay from 8 → 0) ---
  let timeScore = Math.max(
    0,
    TIME_MAX * (1 - Math.min(tSeconds, MAX_TIME) / MAX_TIME)
  );

  // --- Syntax error contribution (linear decay from 10 → 0) ---
  let syntaxScore = Math.max(
    0,
    SYNTAX_MAX * (1 - Math.min(syntaxErrors, MAX_SYNTAX) / MAX_SYNTAX)
  );

  // --- Wrong submission contribution (linear decay from 7 → 0) ---
  let wrongScore = Math.max(
    0,
    WRONG_MAX * (1 - Math.min(wrongSubmissions, MAX_WRONG) / MAX_WRONG)
  );

  // --- Total Score (scaled by passed testcases) ---
  const totalScore = BASE + timeScore + syntaxScore + wrongScore;
  return (passedCount / totalTestcases) * totalScore;
}

export async function updateTeamScore(
  teamId: string,
  questionNumber: number,
  passedCount: number,
  newScore: number
): Promise<void> {
  const team = await User.findById(teamId);
  if (!team) {
    logger.warn('Team not found while updating score', { teamId });
    return;
  }

  // Ensure arrays have enough length, padding with zeros if needed
  let testcasesPassedArr = Array.isArray(team.testcases_passed) ? [...team.testcases_passed] : [];
  let testcasesScoreArr = Array.isArray(team.testcases_score) ? [...team.testcases_score] : [];
  
  // Pad arrays with zeros if needed
  while (testcasesPassedArr.length < questionNumber) {
    testcasesPassedArr.push(0);
  }
  while (testcasesScoreArr.length < questionNumber) {
    testcasesScoreArr.push(0);
  }

  // Update values at the correct index (questionNumber - 1)
  const idx = questionNumber - 1;
  testcasesPassedArr[idx] = Math.max(testcasesPassedArr[idx] ?? 0, passedCount);
  testcasesScoreArr[idx] = Math.max(testcasesScoreArr[idx] ?? 0, newScore);

  // Calculate total score as sum of testcases_score array
  const totalScore = testcasesScoreArr.reduce((sum, score) => sum + (score || 0), 0);

  await User.findByIdAndUpdate(teamId, {
    score: totalScore,
    testcases_passed: testcasesPassedArr,
    testcases_score: testcasesScoreArr
  });

  logger.info('Updated team score', {
    teamId,
    questionNumber,
    newTotalScore: totalScore,
    testcasesPassed: testcasesPassedArr[idx],
    questionScore: testcasesScoreArr[idx]
  });
}

export function calculatePassedCount(results: TestResult[]): number {
  return results.filter(r => r.passed).length;
}