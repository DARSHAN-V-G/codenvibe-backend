import type { Request, Response } from 'express';
import Round2Submission from '../models/round2Submission.js';
import Round2Question from '../models/round2question.js';
import { logger } from '../utils/logger.js';

interface ICreateRound2SubmissionRequest {
    questionid: string;
    prompt_statements: string;
    tech_stack_used: string;
    github_link: string[];
    video_url: string;
}

export const createRound2Submission = async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const { questionid, prompt_statements, tech_stack_used, github_link, video_url } = req.body as ICreateRound2SubmissionRequest;
        const files = req.files as Express.Multer.File[];
        const teamid = req.user?.userId;

        if (!teamid) {
            logger.warn('Round 2 submission attempt without user ID');
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Validate question exists
        const question = await Round2Question.findById(questionid);
        if (!question) {
            logger.warn('Round 2 submission attempt for non-existent question', { questionid });
            return res.status(404).json({ error: 'Question not found' });
        }

        // Validate required fields
        if (!prompt_statements || !tech_stack_used || !github_link || !video_url) {
            logger.warn('Invalid round 2 submission data', {
                hasPromptStatements: !!prompt_statements,
                hasTechStack: !!tech_stack_used,
                hasGithubLinks: !!github_link,
                hasVideoUrl: !!video_url
            });
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Get image URLs from uploaded files
        const image_url = files ? files.map(file => file.path) : [];

        // Create submission
        const submission = await Round2Submission.create({
            questionid,
            teamid,
            image_url,
            github_link,
            prompt_statements,
            tech_stack_used,
            video_url
        });

        logger.info('Round 2 submission created successfully', {
            submissionId: submission._id,
            questionId: questionid,
            imageCount: image_url.length,
            githubLinkCount: github_link.length
        });

        res.status(201).json({
            success: true,
            submission
        });

    } catch (error) {
        logger.error('Error creating round 2 submission', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
        res.status(500).json({
            success: false,
            error: errMsg
        });
    }
};

// Get submission by question ID
export const checkRound2Submission = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params;
        const teamid = req.user?.userId;

        if (!teamid) {
            logger.warn('Round 2 submission check attempt without user ID');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const submission = await Round2Submission.findOne({ 
            questionid: questionId,
            teamid: teamid
        }).select('_id'); // Only select the ID for efficiency

        logger.info('Checked round 2 submission existence', {
            questionId,
            teamid,
            exists: !!submission
        });

        res.json({
            exists: !!submission,
            submission: submission ? { _id: submission._id } : null
        });

    } catch (error) {
        logger.error('Error checking round 2 submission', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            questionId: req.params.questionId,
            teamid: req.user?.userId
        });
        const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
        res.status(500).json({ error: errMsg });
    }
};

export const getRound2Submission = async (req: Request, res: Response) => {
    try {
        const { questionId } = req.params;
        const teamid = req.user?.userId;

        if (!teamid) {
            logger.warn('Round 2 submission access attempt without user ID');
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const submission = await Round2Submission.findOne({ 
            questionid: questionId,
            teamid: teamid
        });
        
        if (!submission) {
            return res.status(404).json({ error: 'No submission found for this question' });
        }

        res.json({
            success: true,
            submission
        });

    } catch (error) {
        logger.error('Error fetching round 2 submission', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            questionId: req.params.questionId
        });
        const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
        res.status(500).json({
            success: false,
            error: errMsg
        });
    }
};