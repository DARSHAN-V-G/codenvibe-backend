import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

export const getLogs = async (req: Request, res: Response) => {
    try {
        const { type = 'combined', lines = 1000 } = req.query;
        const logFile = type === 'error' ? 'error.log' : 'combined.log';
        const logPath = path.join('logs', logFile);

        // Read the log file
        const fileContent = await fs.readFile(logPath, 'utf-8');
        
        // Parse and format log entries
        const logs = fileContent
            .trim()
            .split('\n')
            .slice(-Number(lines)) // Get last n lines
            .map(line => {
                try {
                    const parsedLog = JSON.parse(line);
                    // Remove ANSI color codes from message
                    const cleanMessage = parsedLog.message.replace(/\u001b\[\d+m/g, '');
                    return {
                        timestamp: parsedLog.timestamp,
                        level: parsedLog.level,
                        message: cleanMessage,
                        method: parsedLog.method,
                        url: parsedLog.url,
                        status: parsedLog.status,
                        responseTime: parsedLog.responseTime,
                        userId: parsedLog.userId,
                        ip: parsedLog.ip,
                        userAgent: parsedLog.userAgent,
                        error: parsedLog.error,
                        stack: parsedLog.stack,
                        context: parsedLog.context,
                        meta: parsedLog.meta
                    };
                } catch (e) {
                    return {
                        timestamp: new Date().toISOString(),
                        level: 'unknown',
                        message: line.replace(/\u001b\[\d+m/g, '') // Also clean raw messages
                    };
                }
            });

        res.json({
            total: logs.length,
            type: type,
            logs: logs
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to retrieve logs',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

