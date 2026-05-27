import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../utils/supabase';
import { AppError } from '../middleware/errorHandler';
import { generateOutfitStream } from '../services/outfitService';
import { visualizeOutfit } from '../services/visualizeService';

const router = Router();

const FREE_WEEKLY_OUTFIT_LIMIT = 3;

const generateSchema = z.object({
  occasion: z.string().min(1),
  vibe: z.string().optional(),
  venue: z.string().optional(),
  time_of_day: z.string().optional(),
  weather_override: z.object({
    temp_c: z.number(),
    condition: z.string(),
  }).optional(),
  generation_round: z.number().int().min(1).default(1),
});

// POST /outfits/generate — SSE stream, emits each outfit as it's ready
router.post('/generate', async (req: Request, res: Response) => {
  // Enforce Free tier weekly limit
  if (req.userTier === 'free') {
    const weekStart = getWeekStart();
    const { data: counter } = await supabase
      .from('outfit_usage_counters')
      .select('outfit_count')
      .eq('user_id', req.userId)
      .eq('week_start', weekStart)
      .single();

    if ((counter?.outfit_count ?? 0) >= FREE_WEEKLY_OUTFIT_LIMIT) {
      res.status(403).json({ error: 'Weekly outfit limit reached. Upgrade to Pro for unlimited outfits.' });
      return;
    }
  }

  let body: z.infer<typeof generateSchema>;
  try {
    body = generateSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const insertedIds: string[] = [];

  try {
    for await (const outfit of generateOutfitStream(req.userId, body)) {
      insertedIds.push(outfit.id);
      res.write(`data: ${JSON.stringify(outfit)}\n\n`);
    }

    await incrementUsageCounter(req.userId);
    res.write('data: [DONE]\n\n');
    res.end();

    // Pre-generate visualizations silently after response is sent
    for (const id of insertedIds) {
      visualizeOutfit(id, req.userId).catch(() => {});
    }
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Failed to generate outfits';
    res.write(`data: {"error":"${message}"}\n\n`);
    res.end();
  }
});

// GET /outfits — lookbook (saved outfits only)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('generated_outfits')
      .select('*')
      .eq('user_id', req.userId)
      .eq('saved', true)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch lookbook');
    res.json({ outfits: data });
  } catch (err) {
    next(err);
  }
});

// POST /outfits/:id/visualize
router.post('/:id/visualize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imageUrl = await visualizeOutfit(String(req.params.id), req.userId);
    res.json({ image_url: imageUrl });
  } catch (err) {
    next(err);
  }
});

// PATCH /outfits/:id — save or add feedback
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateSchema = z.object({
      saved: z.boolean().optional(),
      feedback: z.enum(['loved', 'disliked']).optional(),
    });
    const body = updateSchema.parse(req.body);

    const { data, error } = await supabase
      .from('generated_outfits')
      .update(body)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to update outfit');
    res.json({ outfit: data });
  } catch (err) {
    next(err);
  }
});

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

async function incrementUsageCounter(userId: string): Promise<void> {
  const weekStart = getWeekStart();
  await supabase.rpc('increment_outfit_counter', { p_user_id: userId, p_week_start: weekStart });
}

export default router;
