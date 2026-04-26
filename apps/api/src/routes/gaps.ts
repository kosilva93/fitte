import { Router, Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../utils/supabase';
import { AppError } from '../middleware/errorHandler';
import { requireTier } from '../middleware/requireTier';
import { logger } from '../utils/logger';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// All gap routes require Pro
router.use(requireTier('pro'));

// GET /gaps — return saved gap analysis for the user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('wardrobe_gaps')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw new AppError(500, 'Failed to fetch gap analysis');
    res.json({ analysis: data ?? null });
  } catch (err) {
    next(err);
  }
});

// POST /gaps/analyze — run a fresh gap analysis via Claude
router.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: items } = await supabase
      .from('wardrobe_items')
      .select('item_type, colors, silhouette, fabric, label, brand, tags, occasion_tags, season')
      .eq('user_id', req.userId)
      .is('deleted_at', null);

    const { data: profile } = await supabase
      .from('users')
      .select('age, gender, body_type, aesthetics, preferred_brands, budget_max, city')
      .eq('id', req.userId)
      .single();

    const wardrobeSummary = JSON.stringify(items ?? [], null, 2);
    const profileSummary = [
      profile?.gender ? `Style identity: ${profile.gender}` : null,
      profile?.body_type ? `Body type: ${profile.body_type}` : null,
      profile?.aesthetics?.length ? `Aesthetics: ${profile.aesthetics.join(', ')}` : null,
      profile?.budget_max ? `Budget per item: up to $${Math.round(profile.budget_max / 100)}` : null,
      profile?.city ? `Location: ${profile.city}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `You are Fitte, a high-end personal stylist. Analyze this wardrobe and identify the top gaps.

USER PROFILE:
${profileSummary || 'No profile data'}

CURRENT WARDROBE:
${wardrobeSummary}

Identify exactly 5 high-value wardrobe gaps — items that are missing but would dramatically expand outfit possibilities for this user's lifestyle and aesthetic.

For each gap:
- Be specific (e.g. "slim-fit white Oxford shirt" not just "shirt")
- Explain why it fills a gap
- Suggest a budget-appropriate price range
- Name 2-3 specific brands that would work

Return valid JSON only:
{
  "gaps": [
    {
      "item": "specific item name",
      "category": "top|bottom|shoes|outerwear|accessory|dress|suit",
      "why": "one sentence explanation",
      "price_range": "$XX–$XX",
      "brands": ["Brand1", "Brand2"]
    }
  ],
  "summary": "2-sentence overall wardrobe assessment"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new AppError(500, 'Unexpected AI response');

    let parsed: { gaps: GapItem[]; summary: string };
    try {
      parsed = JSON.parse(content.text);
    } catch {
      logger.error('Failed to parse gap analysis JSON', { userId: req.userId });
      throw new AppError(500, 'Failed to generate gap analysis');
    }

    // Upsert — one analysis per user (replace existing)
    const { data, error } = await supabase
      .from('wardrobe_gaps')
      .upsert(
        {
          user_id: req.userId,
          gaps: parsed.gaps,
          summary: parsed.summary,
          wardrobe_size: items?.length ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to save gap analysis');
    res.json({ analysis: data });
  } catch (err) {
    next(err);
  }
});

interface GapItem {
  item: string;
  category: string;
  why: string;
  price_range: string;
  brands: string[];
}

export default router;
