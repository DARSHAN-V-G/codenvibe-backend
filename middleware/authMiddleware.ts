import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/authUtils.js';
import type { JwtPayload } from 'jsonwebtoken';

import type { AuthTokenPayload, AuthResponse } from '../utils/authUtils.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      const response: AuthResponse = {
        success: false,
        message: 'Please authenticate'
      };
      res.status(401).json(response);
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const response: AuthResponse = {
        success: false,
        message: 'Invalid token'
      };
      res.status(401).json(response);
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    const response: AuthResponse = {
      success: false,
      message: 'Authentication failed'
    };
    res.status(401).json(response);
  }
};
