import { fal } from '@fal-ai/client';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

fal.config({ credentials: process.env.FAL_KEY });

export async function visualizeOutfit(outfitId: string, userId: string): Promise<string> {
  const { data: outfit, error } = await supabase
    .from('generated_outfits')
    .select('description, recommended_items, color_logic, occasion, vibe, image_url')
    .eq('id', outfitId)
    .eq('user_id', userId)
    .single();

  if (error || !outfit) throw new Error('Outfit not found');

  // Already visualized — return cached image
  if (outfit.image_url) return outfit.image_url;

  const recommendedText = outfit.recommended_items?.length
    ? `Recommended additions: ${outfit.recommended_items.map((r: { type: string; description: string }) => r.description).join(', ')}.`
    : '';

  const prompt = `Fashion editorial flat-lay photograph of a complete outfit for ${outfit.occasion}. ${outfit.description} ${recommendedText} Color palette: ${outfit.color_logic ?? 'coordinated'}. Clean white background, professional styling, high-end fashion magazine aesthetic. No people, no text, no watermarks.`;

  logger.info('Generating outfit visualization via Fal.ai flux/schnell', { outfitId, userId });

  const result = await fal.run('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: 'square_hd',
      num_images: 1,
      num_inference_steps: 4,
    },
  }) as unknown as { images: { url: string }[] };

  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) throw new Error('No image returned from Fal.ai');

  // Fetch and upload to Supabase storage so we control the URL
  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const storagePath = `outfit-visualizations/${userId}/${outfitId}.png`;

  const { error: uploadError } = await supabase.storage
    .from('outfit-visualizations')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

  if (uploadError) throw new Error(`Failed to upload visualization: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('outfit-visualizations')
    .getPublicUrl(storagePath);

  await supabase
    .from('generated_outfits')
    .update({ image_url: publicUrl })
    .eq('id', outfitId)
    .eq('user_id', userId);

  return publicUrl;
}
