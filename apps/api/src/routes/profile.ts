import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../utils/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /profile
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error) throw new AppError(404, 'Profile not found');
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

const updateProfileSchema = z.object({
  age: z.number().int().min(1).max(120).optional(),
  city: z.string().optional(),
  country: z.string().length(2).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().optional(),
  budget_currency: z.string().length(3).optional(),
  preferred_brands: z.array(z.string()).optional(),
  staple_items: z.array(z.string()).optional(),
  gender: z.enum(['menswear', 'womenswear', 'unisex']).optional(),
  body_type: z.enum(['slim', 'athletic', 'straight', 'broad', 'curvy']).optional(),
  aesthetics: z.array(z.string()).optional(),
  profile_complete: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
  notification_time: z.string().optional(),
});

// PATCH /profile
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateProfileSchema.parse(req.body);

    const { data, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to update profile');
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

export default router;
