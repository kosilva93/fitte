import OpenAI from 'openai';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function visualizeOutfit(outfitId: string, userId: string): Promise<string> {
  const { data: outfit, error } = await supabase
    .from('generated_outfits')
    .select('description, recommended_items, color_logic, occasion, vibe')
    .eq('id', outfitId)
    .eq('user_id', userId)
    .single();

  if (error || !outfit) throw new Error('Outfit not found');

  const recommendedText = outfit.recommended_items?.length
    ? `Recommended additions: ${outfit.recommended_items.map((r: { type: string; description: string }) => r.description).join(', ')}.`
    : '';

  const prompt = `Fashion editorial flat-lay photograph of a complete outfit for ${outfit.occasion}. ${outfit.description} ${recommendedText} Color palette: ${outfit.color_logic ?? 'coordinated'}. Clean white background, professional styling, high-end fashion magazine aesthetic. No people, no text, no watermarks.`;

  logger.info('Generating outfit visualization', { outfitId, userId });

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'medium',
  });

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) throw new Error('No image returned from DALL-E');

  await supabase
    .from('generated_outfits')
    .update({ image_url: imageUrl })
    .eq('id', outfitId)
    .eq('user_id', userId);

  return imageUrl;
}
