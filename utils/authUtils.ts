import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

// Custom types
export interface AuthTokenPayload extends JwtPayload {
  userId: string;
}

export interface TeamInfo {
  team_name: string;
  roll_nos: string[];
  emails: string[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
  team?: TeamInfo | undefined;
}

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  text: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export const sendOTP = async (email: string, otp: string): Promise<void> => {
  const mailOptions: EmailConfig = {
    from: process.env.USER_EMAIL || '',
    to: email,
    subject: 'Login OTP',
    text: `Your OTP for login is: ${otp}. This OTP will expire in 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateToken = (userId: string): string => {
  try {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
};

export const verifyToken = (token: string): AuthTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return decoded;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

export const clearAuthCookie = (res: Response): void => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });
};

export const sendAuthResponse = (res: Response, statusCode: number, token: string, team?: TeamInfo): void => {
  // Set JWT token in HTTP-only cookie
  res.cookie('jwt', token, {
    
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours (matching JWT_EXPIRES_IN)
  });

  // Send response without including the token in the body
  const response: AuthResponse = {
    success: true,
    message: 'Authentication successful',
    team // Include team details if provided
  };
  res.status(statusCode).json(response);
};
