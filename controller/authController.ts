import type { Request, Response } from 'express';
import User from '../models/userModel.js';
import { generateOTP, sendOTP, generateToken, sendAuthResponse, type AuthResponse } from '../utils/authUtils.js';
import type { Document, Types } from 'mongoose';
import { logger } from '../utils/logger.js';

interface OTPDocument {
  code: string;
  generatedAt: Date;
  expiresAt: Date;
}

interface TeamDocument extends Document {
  _id: Types.ObjectId;
  team_name: string;
  roll_nos: string[];
  emails: string[];
  otp: OTPDocument | null;
}

export const requestLogin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    logger.info('Login request received', { email });

    if (!email) {
      logger.warn('Login request missing email');
      const response: AuthResponse = {
        success: false,
        message: 'Email is required'
      };
      res.status(400).json(response);
      return;
    }

    
    const team = await User.findOne({ emails: email }) as TeamDocument;
    if (!team) {
      logger.warn('Login attempt with non-existent team email', { email });
      const response: AuthResponse = {
        success: false,
        message: 'No team found with this email. Please contact administrator for access.'
      };
      res.status(404).json(response);
      return;
    }
    logger.info('Team found for login request', { teamId: team._id, teamName: team.team_name });

    // Generate OTP
    const otp = generateOTP();
    const now = new Date();
    
    // Save OTP to team document with 5 minutes expiry
    const otpData: OTPDocument = {
      code: otp,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 10 * 60000), // 5 minutes expiry
    };
    team.otp = otpData;
    await team.save();
    await sendOTP(email, otp);

    const response: AuthResponse = {
      success: true,
      message: 'OTP sent successfully to all team members'
    };
    res.status(200).json(response);
  } catch (error) {
    logger.error('Login request error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email: req.body.email 
    });
    const response: AuthResponse = {
      success: false,
      message: 'Error processing login request'
    };
    res.status(500).json(response);
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    logger.info('OTP verification request received', { email });

    if (!email || !otp) {
      logger.warn('OTP verification missing required fields', { 
        email: email ? 'provided' : 'missing',
        otp: otp ? 'provided' : 'missing'
      });
      const response: AuthResponse = {
        success: false,
        message: 'Email and OTP are required'
      };
      res.status(400).json(response);
      return;
    }

    const team = await User.findOne({ emails: email }) as TeamDocument;
    if (!team) {
      const response: AuthResponse = {
        success: false,
        message: 'Team not found'
      };
      res.status(404).json(response);
      return;
    }

    // Check if OTP exists and is valid
    if (!team.otp || !team.otp.code || !team.otp.expiresAt) {
      const response: AuthResponse = {
        success: false,
        message: 'No OTP request found'
      };
      res.status(400).json(response);
      return;
    }

    // Check if OTP is expired
    if (new Date() > team.otp.expiresAt) {
      const response: AuthResponse = {
        success: false,
        message: 'OTP has expired'
      };
      res.status(400).json(response);
      return;
    }

    // Verify OTP
    if (team.otp.code !== otp) {
      const response: AuthResponse = {
        success: false,
        message: 'Invalid OTP'
      };
      res.status(400).json(response);
      return;
    }

    // Clear OTP after successful verification
    team.otp = null;
    await team.save();

    // Generate JWT token with team details
    const token = generateToken(team._id.toString());

    // Set token in cookie
    res.cookie('codenvibe_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });

    // Send response with team details (token is now in cookie)
    const response: AuthResponse = {
      success: true,
      team: {
        team_name: team.team_name,
        roll_nos: team.roll_nos,
        emails: team.emails
      }
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('OTP verification error:', error);
    const response: AuthResponse = {
      success: false,
      message: 'Error verifying OTP'
    };
    res.status(500).json(response);
  }
};
