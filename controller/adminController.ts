import type { Request, Response } from 'express';
import User from '../models/userModel.js';
import type { AuthResponse, TeamInfo } from '../utils/authUtils.js';
import type { Document, Types } from 'mongoose';
import { logger } from '../utils/logger.js';

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
