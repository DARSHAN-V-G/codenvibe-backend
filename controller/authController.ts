import type { Request, Response } from 'express';
import User from '../models/userModel.js';
import { generateOTP, sendOTP, generateToken, sendAuthResponse, type AuthResponse } from '../utils/authUtils.js';
import type { Document, Types } from 'mongoose';

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

    if (!email) {
      const response: AuthResponse = {
        success: false,
        message: 'Email is required'
      };
      res.status(400).json(response);
      return;
    }

    
    const team = await User.findOne({ emails: email }) as TeamDocument;
    if (!team) {
      const response: AuthResponse = {
        success: false,
        message: 'No team found with this email. Please contact administrator for access.'
      };
      res.status(404).json(response);
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const now = new Date();
    
    // Save OTP to team document with 5 minutes expiry
    const otpData: OTPDocument = {
      code: otp,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 5 * 60000), // 5 minutes expiry
    };
    team.otp = otpData;
    await team.save();

    // Send OTP via email to all team members
    await Promise.all(team.emails.map(teamEmail => sendOTP(teamEmail, otp)));

    const response: AuthResponse = {
      success: true,
      message: 'OTP sent successfully to all team members'
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Login request error:', error);
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

    if (!email || !otp) {
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

    // Send response with token and team details
    const response: AuthResponse = {
      success: true,
      token,
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
