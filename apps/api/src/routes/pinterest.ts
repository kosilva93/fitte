import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { requireTier } from '../middleware/requireTier';

const router = Router();

// All Pinterest routes require Premium tier
router.use(requireTier('premium'));

// GET /pinterest/auth-url — generate OAuth URL for client to open
router.get('/auth-url', (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.PINTEREST_CLIENT_ID!,
    redirect_uri: process.env.PINTEREST_REDIRECT_URI!,
    response_type: 'code',
    scope: 'boards:read,pins:read',
    state: req.userId, // used to verify callback
  });

  res.json({ url: `https://www.pinterest.com/oauth/?${params}` });
});

// GET /pinterest/callback — handle OAuth redirect
router.get('/callback', async (_req: Request, _res: Response, next: NextFunction) => {
  // TODO: exchange code for token, encrypt and store in pinterest_connections
  try {
    throw new AppError(501, 'Pinterest callback not yet implemented');
  } catch (err) {
    next(err);
  }
});

export default router;
