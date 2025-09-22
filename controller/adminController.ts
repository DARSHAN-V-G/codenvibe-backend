import type { Request, Response } from 'express';
import User from '../models/userModel.js';
import type { AuthResponse, TeamInfo } from '../utils/authUtils.js';
import type { Document } from 'mongoose';
import { Types } from 'mongoose';
import { logger } from '../utils/logger.js';
import Round2Question from '../models/round2question.js';
import Round2Submission from '../models/round2Submission.js';
import Admin from '../models/admin.js';

// Update current round
export const updateCurrentRound = async (req: Request, res: Response) => {
  try {
    const { round } = req.body;

    // Validate round value
    if (typeof round !== 'number' || ![1, 2].includes(round)) {
      logger.warn('Invalid round update attempt', { round });
      return res.status(400).json({ 
        success: false, 
        error: 'Round must be either 1 or 2' 
      });
    }

    // Update admin record
    const admin = await Admin.findOneAndUpdate(
      { username: 'admin' },
      { current_round: round },
      { new: true } // Return the updated document
    );

    if (!admin) {
      logger.error('Admin record not found while updating round');
      return res.status(500).json({
        success: false,
        error: 'Admin configuration not found'
      });
    }

    logger.info('Current round updated successfully', {
      previousRound: admin.current_round,
      newRound: round
    });

    res.json({
      success: true,
      message: `Current round updated to ${round}`,
      current_round: round
    });

  } catch (error) {
    logger.error('Error updating current round', {
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

// Get all submissions for a specific round 2 question with team details
export const getRound2QuestionSubmissions = async (req: Request, res: Response) => {
  try {
    const { questionid } = req.params;

    logger.info('Fetching round 2 submissions', { questionid });

    // Check if question exists
    const question = await Round2Question.findById(questionid);
    if (!question) {
      logger.warn('Attempt to fetch submissions for non-existent question', { questionid });
      return res.status(404).json({ error: 'Question not found' });
    }

    // Fetch submissions with team details using aggregation
    const submissions = await Round2Submission.aggregate([
      // Match submissions for this question
      { 
        $match: { 
          questionid: new Types.ObjectId(questionid) 
        } 
      },
      // Lookup team details from User collection
      {
        $lookup: {
          from: 'users',
          localField: 'teamid',
          foreignField: '_id',
          as: 'team'
        }
      },
      // Unwind the team array (since lookup returns an array)
      {
        $unwind: '$team'
      },
      // Project only the fields we need
      {
        $project: {
          _id: 1,
          image_url: 1,
          github_link: 1,
          prompt_statements: 1,
          tech_stack_used: 1,
          video_url: 1,
          'team._id': 1,
          'team.team_name': 1,
          'team.roll_nos': 1,
          'team.members': 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      // Sort by creation date
      {
        $sort: { createdAt: -1 }
      }
    ]);

    logger.info('Round 2 submissions retrieved successfully', { 
      questionid,
      submissionCount: submissions.length 
    });

    res.json({
      success: true,
      data : submissions
    });

  } catch (error) {
    logger.error('Error fetching round 2 submissions', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      questionid: req.params.questionid
    });
    const errMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    res.status(500).json({ 
      success: false, 
      error: errMsg 
    });
  }
};

// Controller to add a new round 2 question
export const addRound2Question = async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      logger.warn('Invalid round 2 question data', { 
        hasDescription: !!description,
        descriptionType: typeof description
      });
      return res.status(400).json({ 
        error: 'Description is required and must be a string' 
      });
    }

    const round2Question = await Round2Question.create({ description });
    
    logger.info('Round 2 question created successfully', {
      questionId: round2Question._id
    });

    res.status(201).json({
      success: true,
      question: round2Question
    });
  } catch (error) {
    logger.error('Error creating round 2 question', {
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

interface TeamDocument extends Document {
  _id: Types.ObjectId;
  team_name: string;
  roll_nos: string[];
  emails: string[];
  otp: {
    code: string;
    generatedAt: Date;
    expiresAt: Date;
  } | null;
}

export const addTeam = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    logger.info('Adding new team', { teamName: userData.team_name });
    
    // Check if any email already exists in another team
    if (Array.isArray(userData.emails) && userData.emails.length > 0) {
      const existingTeam = await User.findOne({ emails: { $in: userData.emails } });
      if (existingTeam) {
        logger.warn('Attempted to add team with existing emails', { 
          existingTeam: existingTeam.team_name,
          conflictingEmails: userData.emails 
        });
        return res.status(400).json({ error: 'One or more emails are already registered with another team.' });
      }
    }
    const user = new User(userData);
    await user.save();
    logger.info('Team added successfully', { 
      teamId: user._id,
      teamName: user.team_name,
      memberCount: user.emails.length 
    });
    res.status(201).json({ message: 'User added successfully', user });
  } catch (error) {
    logger.error('Error adding team', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      teamData: {
        teamName: req.body.team_name,
        emailCount: req.body.emails?.length
      }
    });
    const response: AuthResponse = {
      success: false,
      message: 'Error adding teams'
    };
    res.status(500).json(response);
  }
};

export const getAllTeams = async (_req: Request, res: Response) => {
  try {
    logger.info('Fetching all teams');
    const teams = await User.find({}, 'team_name roll_nos emails members');
    logger.info('Teams retrieved successfully', { teamCount: teams.length });
    
    res.status(200).json({
      success: true,
      teams: teams.map(team => ({
        team_name: team.team_name,
        roll_nos: team.roll_nos,
        emails: team.emails,
        members : team.members
      }))
    });
  } catch (error) {
    console.error('Get teams error:', error);
    const response: AuthResponse = {
      success: false,
      message: 'Error retrieving teams'
    };
    res.status(500).json(response);
  }
};

export const removeTeam = async (req: Request, res: Response) => {
  try {
    const { team_name } = req.body;
    logger.info('Team removal request received', { teamName: team_name });

    if (!team_name) {
      logger.warn('Team removal request missing team name');
      const response: AuthResponse = {
        success: false,
        message: 'Team name is required'
      };
      res.status(400).json(response);
      return;
    }

    const team = await User.findOneAndDelete({ team_name });
    if (!team) {
      logger.warn('Attempted to remove non-existent team', { teamName: team_name });
      const response: AuthResponse = {
        success: false,
        message: 'Team not found'
      };
      res.status(404).json(response);
      return;
    }

    logger.info('Team removed successfully', { 
      teamId: team._id,
      teamName: team.team_name,
      memberCount: team.emails.length 
    });
    const response: AuthResponse = {
      success: true,
      message: 'Team removed successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Remove team error:', error);
    const response: AuthResponse = {
      success: false,
      message: 'Error removing team'
    };
    res.status(500).json(response);
  }
};
