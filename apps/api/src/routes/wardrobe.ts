import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../utils/supabase';
import { AppError } from '../middleware/errorHandler';
import { classifyWardrobeItem } from '../services/classificationService';

const router = Router();

const FREE_TIER_ITEM_LIMIT = 10;

// GET /wardrobe — list all active wardrobe items for the user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', req.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch wardrobe items');
    res.json({ items: data });
  } catch (err) {
    next(err);
  }
});

// POST /wardrobe/upload-url — get a signed URL for direct-to-storage upload
router.post('/upload-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enforce Free tier item limit before issuing an upload URL
    if (req.userTier === 'free') {
      const { count } = await supabase
        .from('wardrobe_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .is('deleted_at', null);

      if ((count ?? 0) >= FREE_TIER_ITEM_LIMIT) {
        throw new AppError(403, 'Free tier limit reached. Upgrade to add more items.');
      }
    }

    const fileName = `${req.userId}/${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('wardrobe-photos')
      .createSignedUploadUrl(fileName);

    if (error) throw new AppError(500, 'Failed to generate upload URL');
    res.json({ uploadUrl: data.signedUrl, path: fileName });
  } catch (err) {
    next(err);
  }
});

const createItemSchema = z.object({
  photo_path: z.string().optional(),
  item_type: z.enum(['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'dress', 'suit']),
  label: z.string().optional(),
  brand: z.string().optional(),
  colors: z.array(z.string()).default([]),
  silhouette: z.string().optional(),
  fabric: z.string().optional(),
  tags: z.array(z.string()).default([]),
  season: z.array(z.string()).default([]),
  occasion_tags: z.array(z.string()).default([]),
});

// POST /wardrobe/items — confirm an uploaded item and trigger classification
router.post('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enforce Free tier item limit for direct item creation (same as upload-url)
    if (req.userTier === 'free') {
      const { count } = await supabase
        .from('wardrobe_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .is('deleted_at', null);

      if ((count ?? 0) >= FREE_TIER_ITEM_LIMIT) {
        throw new AppError(403, 'Free tier limit reached. Upgrade to add more items.');
      }
    }

    const body = createItemSchema.parse(req.body);

    // Compute the public URL for display (wardrobe-photos bucket must allow public reads)
    const photoPublicUrl = body.photo_path
      ? supabase.storage.from('wardrobe-photos').getPublicUrl(body.photo_path).data.publicUrl
      : null;

    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert({
        user_id: req.userId,
        photo_url: photoPublicUrl,
        photo_thumbnail_url: photoPublicUrl,
        item_type: body.item_type,
        label: body.label,
        brand: body.brand,
        colors: body.colors,
        silhouette: body.silhouette,
        fabric: body.fabric,
        tags: body.tags,
        season: body.season,
        occasion_tags: body.occasion_tags,
        classification_status: body.photo_path ? 'pending' : 'complete',
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to create wardrobe item');

    // Fire-and-forget — classify in background so the response returns immediately
    if (photoPublicUrl) {
      classifyWardrobeItem(data.id, photoPublicUrl).catch(() => {
        // Error is logged inside classifyWardrobeItem; item status set to 'failed'
      });
    }

    res.status(201).json({ item: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /wardrobe/items/:id — soft delete
router.delete('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('wardrobe_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId) // RLS + explicit check
      .select('id');

    if (error) throw new AppError(500, 'Failed to delete item');
    if (!data || data.length === 0) throw new AppError(404, 'Item not found');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
