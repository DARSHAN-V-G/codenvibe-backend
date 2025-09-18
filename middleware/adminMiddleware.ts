import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
declare global {
  namespace Express {
    interface Request {
      admin?: {
        adminId: string;
      };
    }
  }
}
const ADMIN_TOKEN_NAME = 'codenvibe_admin_token';
const JWT_SECRET = process.env.JWT_SECRET || 'adminsecret';

export const adminProtect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[ADMIN_TOKEN_NAME];
    if (!token) {
      return res.status(401).json({ error: 'Admin authentication required.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !('adminId' in decoded)) {
      return res.status(401).json({ error: 'Invalid admin token.' });
    }
    req.admin = { adminId: (decoded as any).adminId };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Admin authentication failed.' });
  }
};
