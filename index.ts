import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import expressWinston from 'express-winston';
import logger from './utils/logger.js';
import connectDB from './db/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { testCloudinaryConnection } from './utils/cloudinaryConfig.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import { adminProtect } from './middleware/adminMiddleware.js';
import questionRoutes from './routes/questionRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import User from './models/userModel.js';
import round2Submissionroute from './routes/round2SubmissionRoutes.js';
import { round1Middleware,round2Middleware } from './middleware/roundMiddleware.js';
import { getCurrentRound } from './controller/adminController.js';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;
console.log("port fetched from env:",process.env.PORT);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Cookie Parser middleware
app.use(cookieParser());

app.use(cors({
  origin: [ process.env.FRONTEND_URL || 'http://localhost:5173',process.env.ADMIN_URL || 'http://localhost:5174',], // Frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));


app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: true,
  level : 'info',
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectDB();

app.use('/auth', authRoutes);
app.use('/question',questionRoutes);
app.use('/submission', submissionRoutes);
app.get('/current-round', getCurrentRound); // New route to get current round
// Admin routes (protected)
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin', adminProtect, adminRoutes);
app.use('/round2', round2Middleware,round2Submissionroute);
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


// Function to broadcast scores to all connected clients or a specific client
async function broadcastScores(targetClient?: WebSocket) {
  try {
    const teams = await User.find({}, 'team_name score year testcases_passed').sort('-score');
    const message = JSON.stringify({ type: 'scores', teams });

    if (targetClient) {
      // Send to specific client if provided
      if (targetClient.readyState === WebSocket.OPEN) {
        targetClient.send(message);
      }
    } else {
      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  } catch (err) {
    console.error('Error broadcasting scores:', err);
    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
      targetClient.send(JSON.stringify({ type: 'error', message: 'Could not fetch scores.' }));
    }
  }
}

// WebSocket: send scores when a client connects
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`New WebSocket client connected from ${clientIp} at ${new Date().toISOString()}`);
  
  // Send initial scores to the new client
  broadcastScores(ws);

  // Log when client disconnects
  ws.on('close', () => {
    console.log(`Client ${clientIp} disconnected at ${new Date().toISOString()}`);
  });
});


export { broadcastScores };

// Start server and initialize services
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Test Cloudinary connection
    await testCloudinaryConnection();
    logger.info('Cloudinary connected successfully');

    // Start the server
    server.listen(port, () => {
      logger.info(`Server is running at http://localhost:${port}`);
      logger.info(`WebSocket server running at ws://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
