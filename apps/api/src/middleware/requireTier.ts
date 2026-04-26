import { Request, Response, NextFunction } from 'express';

type Tier = 'free' | 'pro' | 'premium';

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, premium: 2 };

/**
 * Middleware factory — blocks requests from users below the required tier.
 * Usage: router.get('/gaps', requireTier('pro'), handler)
 */
export function requireTier(minimum: Tier) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (TIER_RANK[req.userTier] < TIER_RANK[minimum]) {
      res.status(403).json({
        error: 'Upgrade required',
        requiredTier: minimum,
        currentTier: req.userTier,
      });
      return;
    }
    next();
  };
}
