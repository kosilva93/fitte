export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type ItemType = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory' | 'dress' | 'suit';

export type ClassificationStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface WardrobeItem {
  id: string;
  user_id: string;
  photo_url: string | null;
  photo_thumbnail_url: string | null;
  item_type: ItemType;
  colors: string[];
  silhouette: string | null;
  fabric: string | null;
  brand: string | null;
  label: string | null;
  tags: string[];
  classification_status: ClassificationStatus;
  season: string[];
  occasion_tags: string[];
  deleted_at: string | null;
  created_at: string;
}

export interface GeneratedOutfit {
  id: string;
  user_id: string;
  occasion: string;
  vibe: string | null;
  weather_context: Record<string, unknown> | null;
  item_ids: string[];
  description: string;
  color_logic: string | null;
  saved: boolean;
  feedback: 'loved' | 'disliked' | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  age: number | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  budget_min: number;
  budget_max: number | null;
  budget_currency: string;
  preferred_brands: string[];
  staple_items: string[];
  profile_complete: boolean;
}

export interface GapItem {
  item: string;
  category: string;
  why: string;
  price_range: string;
  brands: string[];
}

export interface GapAnalysis {
  id: string;
  gaps: GapItem[];
  summary: string;
  wardrobe_size: number;
  updated_at: string;
}

export interface TrendItem {
  id: string;
  source: string;
  source_url: string;
  title: string;
  image_url: string | null;
  summary: string | null;
  tags: string[];
  published_at: string | null;
}
