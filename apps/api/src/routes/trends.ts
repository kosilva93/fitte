import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireTier } from '../middleware/requireTier';

const router = Router();

// GET /trends — Premium only
router.get('/', requireTier('premium'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('trend_items')
      .select('*')
      .eq('is_active', true)
      .order('fetched_at', { ascending: false })
      .limit(50);

    if (error) throw new AppError(500, 'Failed to fetch trends');
    res.json({ trends: data });
  } catch (err) {
    next(err);
  }
});

export default router;
