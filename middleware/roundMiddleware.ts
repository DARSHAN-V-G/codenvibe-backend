import type { Request, Response, NextFunction } from 'express';
import Admin from '../models/admin.js';
import { logger } from '../utils/logger.js';

// Middleware to check if current round is 1
export const round1Middleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admin = await Admin.findOne({ username: 'admin' });
        
        if (!admin) {
            logger.error('Admin record not found');
            return res.status(500).json({ 
                error: 'Admin configuration not found' 
            });
        }

        if (admin.current_round !== 1) {
            logger.warn('Unauthorized round 1 access attempt', {
                currentRound: admin.current_round
            });
            return res.status(403).json({ 
                error: 'Round 1 is not currently active' 
            });
        }

        next();
    } catch (error) {
        logger.error('Error in round 1 middleware', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ 
            error: 'Internal server error checking round status' 
        });
    }
};

// Middleware to check if current round is 2
export const round2Middleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admin = await Admin.findOne({ username: 'admin' });
        
        if (!admin) {
            logger.error('Admin record not found');
            return res.status(500).json({ 
                error: 'Admin configuration not found' 
            });
        }

        if (admin.current_round !== 2) {
            logger.warn('Unauthorized round 2 access attempt', {
                currentRound: admin.current_round
            });
            return res.status(403).json({ 
                error: 'Round 2 is not currently active' 
            });
        }

        next();
    } catch (error) {
        logger.error('Error in round 2 middleware', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ 
            error: 'Internal server error checking round status' 
        });
    }
};