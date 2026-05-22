import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface OutfitRequest {
  occasion: string;
  vibe?: string;
  venue?: string;
  time_of_day?: string;
  weather_override?: { temp_c: number; condition: string };
  generation_round: number;
}

interface RecommendedItem {
  type: string;
  description: string;
  price_range: string;
  brands: string[];
}

interface GeneratedOutfit {
  item_ids: string[];
  recommended_items: RecommendedItem[];
  description: string;
  color_logic: string;
}

export async function generateOutfit(
  userId: string,
  request: OutfitRequest
): Promise<GeneratedOutfit[]> {
  // 1. Load wardrobe
  const { data: items } = await supabase
    .from('wardrobe_items')
    .select('id, item_type, colors, silhouette, fabric, label, tags, occasion_tags, season')
    .eq('user_id', userId)
    .is('deleted_at', null);

  // 2. Load full user profile for context
  const { data: profile } = await supabase
    .from('users')
    .select('age, gender, body_type, aesthetics, preferred_brands, staple_items, budget_min, budget_max, city')
    .eq('id', userId)
    .single();

  const wardrobeContext = JSON.stringify(items ?? [], null, 2);

  // Sanitize user-controlled strings before interpolating into the prompt
  function sanitize(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    return value.replace(/[<>{}[\]\\]/g, '').slice(0, 200);
  }

  // Build a readable profile summary for Claude
  const profileSummary = [
    profile?.age ? `Age: ${profile.age}` : null,
    profile?.gender ? `Style identity: ${profile.gender}` : null,
    profile?.body_type ? `Body type: ${profile.body_type}` : null,
    profile?.aesthetics?.length ? `Aesthetic preferences: ${profile.aesthetics.join(', ')}` : null,
    profile?.preferred_brands?.length ? `Preferred brands: ${profile.preferred_brands.join(', ')}` : null,
    profile?.staple_items?.length ? `Wardrobe staples: ${profile.staple_items.join(', ')}` : null,
    profile?.city ? `Location: ${profile.city}` : null,
  ].filter(Boolean).join('\n');

  const contextSummary = [
    `Occasion: ${sanitize(request.occasion)}`,
    `Vibe: ${sanitize(request.vibe) ?? 'not specified'}`,
    request.venue ? `Venue: ${sanitize(request.venue)}` : null,
    request.time_of_day ? `Time of day: ${sanitize(request.time_of_day)}` : null,
    request.weather_override ? `Weather: ${request.weather_override.temp_c}°C, ${sanitize(request.weather_override.condition)}` : null,
    `Generation round: ${request.generation_round} (vary outfits from previous rounds)`,
  ].filter(Boolean).join('\n');

  const prompt = `You are Fitte, a high-end AI personal stylist. Generate 3 distinct outfit combinations.

USER PROFILE:
${profileSummary || 'No profile data available'}

CONTEXT:
${contextSummary}

WARDROBE ITEMS (with IDs):
${wardrobeContext || 'No wardrobe items uploaded yet.'}

STYLING RULES:
- Build each outfit ground-up: shoes → bottoms/dress → top → outerwear → accessories
- Use wardrobe items (by ID) when they fit the occasion and vibe
- For any gap in the outfit (missing item type or wardrobe is empty), add a recommended_item with a specific purchase suggestion instead — never skip a layer
- recommended_items should be realistic, specific, and within the user's budget range
- Apply color theory and note if monochromatic, complementary, or analogous
- Factor in body type for silhouette choices
- Make each of the 3 outfits clearly distinct
- Keep descriptions vivid but concise (2-3 sentences max)
- Return valid JSON only, no markdown

Return this exact JSON structure:
{
  "outfits": [
    {
      "item_ids": ["uuid-of-owned-item"],
      "recommended_items": [
        {
          "type": "shoes",
          "description": "White leather low-top sneakers",
          "price_range": "$80-120",
          "brands": ["New Balance", "Adidas"]
        }
      ],
      "description": "Ground-up outfit description...",
      "color_logic": "monochromatic|complementary|analogous"
    }
  ]
}`;

  logger.debug('Calling Claude for outfit generation', {
    userId,
    occasion: request.occasion,
    wardrobeSize: items?.length ?? 0,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: 'You are a JSON API. Respond with raw JSON only — no markdown, no code fences, no explanation. Just the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');

  let parsed: { outfits: GeneratedOutfit[] };
  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no JSON object found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    logger.error('Claude returned non-JSON response', { userId, text: content.text.slice(0, 500) });
    throw new Error('Failed to parse outfit recommendations');
  }

  // 3. Persist to generated_outfits
  const outfitsToInsert = parsed.outfits.map((o: GeneratedOutfit) => ({
    user_id: userId,
    occasion: request.occasion,
    vibe: request.vibe,
    item_ids: o.item_ids ?? [],
    recommended_items: o.recommended_items ?? [],
    description: o.description,
    color_logic: o.color_logic,
    generation_round: request.generation_round,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('generated_outfits')
    .insert(outfitsToInsert)
    .select();

  if (insertError) {
    logger.error('Failed to insert outfits', { userId, error: insertError });
    throw new Error('Failed to save outfits');
  }

  return inserted ?? [];
}
