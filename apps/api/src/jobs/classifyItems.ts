import { supabase } from '../utils/supabase';
import { classifyWardrobeItem } from '../services/classificationService';
import { logger } from '../utils/logger';

/**
 * Pick up any wardrobe items stuck in 'pending' or 'processing' and classify them.
 * Runs on a schedule to catch items that failed mid-flight (e.g. server restart).
 */
export async function classifyPendingItems(): Promise<void> {
  const { data: items, error } = await supabase
    .from('wardrobe_items')
    .select('id, photo_url')
    .in('classification_status', ['pending', 'processing'])
    .not('photo_url', 'is', null)
    .limit(20); // process in batches to avoid hammering the API

  if (error) {
    logger.error('Failed to fetch pending wardrobe items', { error });
    return;
  }

  if (!items || items.length === 0) return;

  logger.info(`Classifying ${items.length} pending wardrobe items`);

  // Run sequentially to stay within API rate limits
  for (const item of items) {
    await classifyWardrobeItem(item.id, item.photo_url);
  }
}
