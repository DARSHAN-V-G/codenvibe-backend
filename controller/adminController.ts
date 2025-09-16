import type { Request, Response } from 'express';
import User from '../models/userModel.js';
import type { AuthResponse, TeamInfo } from '../utils/authUtils.js';
import type { Document, Types } from 'mongoose';

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
    const { team_name, roll_nos, emails } = req.body;

    if (!team_name || !roll_nos || !emails) {
      const response: AuthResponse = {
        success: false,
        message: 'Team name, roll numbers, and emails are required'
      };
      res.status(400).json(response);
      return;
    }

    // Validate array lengths
    if (roll_nos.length !== 3 || emails.length !== 3) {
      const response: AuthResponse = {
        success: false,
        message: 'Team must have exactly 3 roll numbers and 3 email addresses'
      };
      res.status(400).json(response);
      return;
    }

    // Check if team name already exists
    const existingTeam = await User.findOne({ team_name });
    if (existingTeam) {
      const response: AuthResponse = {
        success: false,
        message: 'Team with this name already exists'
      };
      res.status(400).json(response);
      return;
    }

    // Check if any of the emails are already registered
    const emailExists = await User.findOne({ emails: { $in: emails } });
    if (emailExists) {
      const response: AuthResponse = {
        success: false,
        message: 'One or more email addresses are already registered'
      };
      res.status(400).json(response);
      return;
    }

    // Create new team
    const team = await User.create({
      team_name,
      roll_nos,
      emails
    });

    const response: AuthResponse = {
      success: true,
      message: 'Team created successfully',
      team: {
        team_name: team.team_name,
        roll_nos: team.roll_nos,
        emails: team.emails
      }
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Add team error:', error);
    const response: AuthResponse = {
      success: false,
      message: 'Error adding team'
    };
    res.status(500).json(response);
  }
};

export const getAllTeams = async (_req: Request, res: Response) => {
  try {
    const teams = await User.find({}, 'team_name roll_nos emails');
    
    res.status(200).json({
      success: true,
      teams: teams.map(team => ({
        team_name: team.team_name,
        roll_nos: team.roll_nos,
        emails: team.emails
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

    if (!team_name) {
      const response: AuthResponse = {
        success: false,
        message: 'Team name is required'
      };
      res.status(400).json(response);
      return;
    }

    const team = await User.findOneAndDelete({ team_name });
    if (!team) {
      const response: AuthResponse = {
        success: false,
        message: 'Team not found'
      };
      res.status(404).json(response);
      return;
    }

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
