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

function sanitize(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/[<>{}[\]\\]/g, '').slice(0, 200);
}

export async function* generateOutfitStream(
  userId: string,
  request: OutfitRequest
) {
  // 1. Parallel fetch — wardrobe + profile + feedback history at the same time
  const [{ data: items }, { data: profile }, { data: feedbackHistory }] = await Promise.all([
    supabase
      .from('wardrobe_items')
      .select('id, item_type, colors, silhouette, fabric, label, tags, occasion_tags, season')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('age, gender, body_type, aesthetics, preferred_brands, staple_items, budget_min, budget_max, city')
      .eq('id', userId)
      .single(),
    supabase
      .from('generated_outfits')
      .select('description, feedback')
      .eq('user_id', userId)
      .in('feedback', ['loved', 'disliked'])
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const wardrobeContext = JSON.stringify(items ?? [], null, 2);

  const loved = feedbackHistory?.filter(o => o.feedback === 'loved').map(o => o.description) ?? [];
  const disliked = feedbackHistory?.filter(o => o.feedback === 'disliked').map(o => o.description) ?? [];

  const profileSummary = [
    profile?.age ? `Age: ${profile.age}` : null,
    profile?.gender ? `Style identity: ${profile.gender}` : 'Style identity: gender-neutral / unisex — do not assume gender',
    profile?.body_type ? `Body type: ${profile.body_type}` : null,
    profile?.aesthetics?.length ? `Aesthetic preferences: ${profile.aesthetics.join(', ')}` : null,
    profile?.preferred_brands?.length ? `Preferred brands: ${profile.preferred_brands.join(', ')}` : null,
    profile?.staple_items?.length ? `Wardrobe staples: ${profile.staple_items.join(', ')}` : null,
    profile?.city ? `Location: ${profile.city}` : null,
    loved.length ? `Previously loved outfits (lean into these styles):\n${loved.map(d => `- ${d}`).join('\n')}` : null,
    disliked.length ? `Previously disliked outfits (avoid these styles):\n${disliked.map(d => `- ${d}`).join('\n')}` : null,
  ].filter(Boolean).join('\n');

  const contextSummary = [
    `Occasion: ${sanitize(request.occasion)}`,
    `Vibe: ${sanitize(request.vibe) ?? 'not specified'}`,
    request.venue ? `Venue: ${sanitize(request.venue)}` : null,
    request.time_of_day ? `Time of day: ${sanitize(request.time_of_day)}` : null,
    request.weather_override ? `Weather: ${request.weather_override.temp_c}°C, ${sanitize(request.weather_override.condition)}` : null,
    `Generation round: ${request.generation_round} (vary outfits from previous rounds)`,
  ].filter(Boolean).join('\n');

  logger.debug('Calling Claude for outfit generation', {
    userId,
    occasion: request.occasion,
    wardrobeSize: items?.length ?? 0,
  });

  // 2. Prompt caching — stable parts (system + wardrobe/profile) are cached for 5 min
  //    Only the variable context (occasion/vibe/weather) is re-processed each call
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: 'You are a JSON API. Respond with raw JSON only — no markdown, no code fences, no explanation. Just the JSON object.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are Fitte, a high-end AI personal stylist.\n\nUSER PROFILE:\n${profileSummary || 'No profile data available'}\n\nWARDROBE ITEMS (with IDs):\n${wardrobeContext || 'No wardrobe items uploaded yet.'}`,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `Generate 3 distinct outfit combinations for this context:

CONTEXT:
${contextSummary}

STYLING RULES:
- Build each outfit ground-up: shoes → bottoms/dress → top → outerwear → accessories
- Use wardrobe items (by ID) when they fit the occasion and vibe
- For any gap, add a recommended_item with a specific purchase suggestion — never skip a layer
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
}`,
          },
        ],
      },
    ],
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

  // 3. Stream outfits to caller one by one as they're inserted
  for (const o of parsed.outfits) {
    const { data: inserted, error: insertError } = await supabase
      .from('generated_outfits')
      .insert({
        user_id: userId,
        occasion: request.occasion,
        vibe: request.vibe,
        item_ids: o.item_ids ?? [],
        recommended_items: o.recommended_items ?? [],
        description: o.description,
        color_logic: o.color_logic,
        generation_round: request.generation_round,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert outfit', { userId, error: insertError });
      continue;
    }

    yield inserted;
  }
}
