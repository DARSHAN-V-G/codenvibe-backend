import express from 'express';
import type { Express, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import connectDB from './db/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { protect } from './middleware/authMiddleware.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();
// Public routes
app.use('/auth', authRoutes);

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
