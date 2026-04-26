import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_ITEM_TYPES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'dress', 'suit'] as const;
type ItemType = typeof VALID_ITEM_TYPES[number];

interface ClassificationResult {
  item_type: ItemType;
  colors: string[];
  silhouette: string | null;
  fabric: string | null;
  tags: string[];
  occasion_tags: string[];
  season: string[];
}

const PROMPT = `You are a fashion classification assistant. Analyse this clothing item and return a JSON object with the following fields:

- item_type: one of "top", "bottom", "shoes", "outerwear", "accessory", "dress", "suit"
- colors: array of 1–3 dominant colours as simple lowercase strings (e.g. "navy", "white", "camel")
- silhouette: one concise descriptor (e.g. "slim-fit", "oversized", "relaxed", "fitted", "wide-leg", "cropped") or null
- fabric: most likely fabric (e.g. "cotton", "denim", "linen", "wool", "leather", "synthetic") or null
- tags: up to 4 style/aesthetic tags (e.g. "casual", "streetwear", "minimalist", "formal", "vintage")
- occasion_tags: up to 3 occasion tags from: work, weekend, evening, gym, outdoor, travel, formal, beach
- season: array of applicable seasons from: spring, summer, fall, winter

Return valid JSON only — no markdown, no explanation.`;

/**
 * Classify a wardrobe item photo using Claude vision.
 * @param itemId - the wardrobe_items row to update
 * @param photoUrl - publicly accessible URL of the photo (wardrobe-photos bucket must allow public reads)
 */
export async function classifyWardrobeItem(itemId: string, photoUrl: string): Promise<void> {
  await supabase
    .from('wardrobe_items')
    .update({ classification_status: 'processing' })
    .eq('id', itemId);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: photoUrl },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(content.text);
    } catch {
      throw new Error(`Failed to parse classification JSON: ${content.text.slice(0, 100)}`);
    }

    // Validate item_type — fall back to keeping existing value if Claude returns something invalid
    const item_type = VALID_ITEM_TYPES.includes(raw.item_type as ItemType)
      ? (raw.item_type as ItemType)
      : undefined;

    const result: Partial<ClassificationResult> = {
      ...(item_type && { item_type }),
      colors: Array.isArray(raw.colors) ? raw.colors : [],
      silhouette: typeof raw.silhouette === 'string' ? raw.silhouette : null,
      fabric: typeof raw.fabric === 'string' ? raw.fabric : null,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      occasion_tags: Array.isArray(raw.occasion_tags) ? raw.occasion_tags : [],
      season: Array.isArray(raw.season) ? raw.season : [],
    };

    await supabase
      .from('wardrobe_items')
      .update({ ...result, classification_status: 'complete' })
      .eq('id', itemId);

    logger.info('Classified wardrobe item', { itemId, item_type: result.item_type });
  } catch (err) {
    logger.error('Classification failed', { itemId, error: err });
    await supabase
      .from('wardrobe_items')
      .update({ classification_status: 'failed' })
      .eq('id', itemId);
  }
}
