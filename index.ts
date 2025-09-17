import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import connectDB from './db/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectDB();
// Public routes
app.use('/auth', authRoutes);
app.use('/question',questionRoutes);
app.use('/submission', submissionRoutes);

// Admin routes (protected)
app.use('/admin', adminRoutes);

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
  res.send('Express + TypeScript Server is running');
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
