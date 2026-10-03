import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import workItemRoutes from './routes/workItemRoutes';
import commentRoutes from './routes/commentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

dotenv.config();

export const app = express();

// Basic Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  exposedHeaders: ['X-Request-ID'],
}));
app.use(express.json());
app.use(requestIdMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/work-items', workItemRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      requestId: req.requestId || 'req_unknown',
    },
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);
