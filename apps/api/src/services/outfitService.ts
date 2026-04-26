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

interface GeneratedOutfit {
  item_ids: string[];
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

  const prompt = `You are Fitte, a high-end AI personal stylist. Generate 3 distinct outfit combinations from the wardrobe below.

USER PROFILE:
${profileSummary || 'No profile data available'}

CONTEXT:
${contextSummary}

STYLING RULES:
- Describe each outfit ground-up: shoes → bottoms/dress → top → outerwear → accessories
- Apply color theory and note if monochromatic, complementary, or analogous
- Factor in the user's body type for silhouette choices (e.g. curvy → avoid boxy cuts, athletic → structured jackets work well)
- Align with the user's aesthetic preferences as the style direction
- Only use items from the wardrobe list — never invent items
- Make each of the 3 outfits clearly distinct from each other
- Keep descriptions vivid but concise (2-3 sentences max per outfit)
- Return valid JSON only, no markdown, no explanation

WARDROBE ITEMS (with IDs):
${wardrobeContext}

Return this exact JSON structure:
{
  "outfits": [
    {
      "item_ids": ["uuid1", "uuid2"],
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
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');

  let parsed: { outfits: GeneratedOutfit[] };
  try {
    parsed = JSON.parse(content.text);
  } catch {
    logger.error('Claude returned non-JSON response', { userId, text: content.text.slice(0, 200) });
    throw new Error('Failed to parse outfit recommendations');
  }

  // 3. Persist to generated_outfits
  const outfitsToInsert = parsed.outfits.map((o: GeneratedOutfit) => ({
    user_id: userId,
    occasion: request.occasion,
    vibe: request.vibe,
    item_ids: o.item_ids,
    description: o.description,
    color_logic: o.color_logic,
    generation_round: request.generation_round,
  }));

  await supabase.from('generated_outfits').insert(outfitsToInsert);

  return parsed.outfits;
}
