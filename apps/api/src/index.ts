import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

import wardrobeRouter from './routes/wardrobe';
import outfitsRouter from './routes/outfits';
import trendsRouter from './routes/trends';
import billingRouter from './routes/billing';
import pinterestRouter from './routes/pinterest';
import profileRouter from './routes/profile';
import gapsRouter from './routes/gaps';

import { startScheduledJobs } from './jobs';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
}));

// Rate limiting — 100 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// RevenueCat webhook — uses its own signature verification, not JWT
app.use('/billing', billingRouter);

// All routes below require Supabase JWT
app.use(authMiddleware);

app.use('/profile', profileRouter);
app.use('/wardrobe', wardrobeRouter);
app.use('/outfits', outfitsRouter);
app.use('/trends', trendsRouter);
app.use('/gaps', gapsRouter);
app.use('/pinterest', pinterestRouter);

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API running on port ${PORT} [${process.env.NODE_ENV}]`);
  startScheduledJobs();
});

export default app;
