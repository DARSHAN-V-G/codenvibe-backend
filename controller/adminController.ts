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
    const userData = req.body;
    // Check if any email already exists in another team
    if (Array.isArray(userData.emails) && userData.emails.length > 0) {
      const existingTeam = await User.findOne({ emails: { $in: userData.emails } });
      if (existingTeam) {
        return res.status(400).json({ error: 'One or more emails are already registered with another team.' });
      }
    }
    const user = new User(userData);
    await user.save();
    res.status(201).json({ message: 'User added successfully', user });
  } catch (error) {
    console.error('Add teams error:', error);
    const response: AuthResponse = {
      success: false,
      message: 'Error adding teams'
    };
    res.status(500).json(response);
  }
};

export const getAllTeams = async (_req: Request, res: Response) => {
  try {
    const teams = await User.find({}, 'team_name roll_nos emails members');
    
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
