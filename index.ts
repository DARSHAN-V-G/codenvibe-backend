import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import expressWinston from 'express-winston';
import logger from './utils/logger.js';
import { getLogs } from './controller/logController.js';
import connectDB from './db/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import { adminProtect } from './middleware/adminMiddleware.js';
import questionRoutes from './routes/questionRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import http from 'http';
import { WebSocketServer } from 'ws';
import User from './models/userModel.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({
  origin: 'http://localhost:5173', // Frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Request logging middleware
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectDB();
// Public routes
app.use('/auth', authRoutes);
app.use('/question',questionRoutes);
app.use('/submission', submissionRoutes);

// Admin routes (protected)
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminProtect, adminRoutes);

// Admin logs route (protected)
app.get('/admin/logs', adminProtect, getLogs);

// Test protected route
app.get('/protected', protect, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'You have access to this protected route',
    user: req.user
  });
});

// Default route
app.get('/', (req: Request, res: Response) => {
  res.send('Codenvibe backend Server is running');
});


// WebSocket: broadcast all team scores
wss.on('connection', async (ws) => {
  try {
    const teams = await User.find({}, 'team_name score');
    ws.send(JSON.stringify({ type: 'scores', teams }));
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: 'Could not fetch scores.' }));
  }
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log(`WebSocket server running at ws://localhost:${port}`);
});
