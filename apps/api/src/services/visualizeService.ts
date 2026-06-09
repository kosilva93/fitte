import { fal } from '@fal-ai/client';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

fal.config({ credentials: process.env.FAL_KEY });

export async function visualizeWardrobeItem(itemId: string, userId: string): Promise<string> {
  const { data: item, error } = await supabase
    .from('wardrobe_items')
    .select('item_type, label, colors, brand, photo_url')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (error || !item) throw new Error('Item not found');
  if (item.photo_url) return item.photo_url;

  const colorDesc = Array.isArray(item.colors) && item.colors.length ? item.colors.join(' and ') + ' ' : '';
  const itemDesc = item.label || item.item_type;
  const brandText = item.brand ? ` by ${item.brand}` : '';
  const prompt = `A single ${colorDesc}${itemDesc}${brandText}. Professional fashion product photography, clean white background, studio lighting, high-end retail style. One item only, no duplicates, no accessories, no people, no text, no watermarks.`;

  logger.info('Generating wardrobe item visualization via Fal.ai flux/dev', { itemId, userId });

  await supabase.from('wardrobe_items').update({ classification_status: 'processing' }).eq('id', itemId);

  const result = await fal.run('fal-ai/flux/dev', {
    input: { prompt, image_size: 'square_hd', num_images: 1, num_inference_steps: 28 },
  }) as unknown as { data: { images: { url: string }[] } };

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('No image returned from Fal.ai');

  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const storagePath = `${userId}/${itemId}-generated.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('wardrobe-photos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw new Error(`Failed to upload: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from('wardrobe-photos').getPublicUrl(storagePath);

  await supabase
    .from('wardrobe_items')
    .update({ photo_url: publicUrl, photo_thumbnail_url: publicUrl, classification_status: 'complete' })
    .eq('id', itemId)
    .eq('user_id', userId);

  return publicUrl;
}

export async function visualizeOutfit(outfitId: string, userId: string): Promise<string> {
  const { data: outfit, error } = await supabase
    .from('generated_outfits')
    .select('description, recommended_items, color_logic, occasion, vibe, image_url')
    .eq('id', outfitId)
    .eq('user_id', userId)
    .single();

  if (error || !outfit) throw new Error('Outfit not found');

  if (outfit.image_url) return outfit.image_url;

  const prompt = `Fashion editorial flat-lay photograph of a complete outfit for ${outfit.occasion}. ${outfit.description} Color palette: ${outfit.color_logic ?? 'coordinated'}. Clean white background, professional styling, high-end fashion magazine aesthetic. Items neatly spread out with clear space between each piece. Shoes shown as a single pair lying flat side by side at a natural angle. One of each item only, no duplicates, no overlapping, no people, no text, no watermarks.`;

  logger.info('Generating outfit visualization via Fal.ai flux/dev', { outfitId, userId });

  const result = await fal.run('fal-ai/flux/dev', {
    input: {
      prompt,
      image_size: 'square_hd',
      num_images: 1,
      num_inference_steps: 35,
    },
  }) as unknown as { data: { images: { url: string }[] } };

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('No image returned from Fal.ai');

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
