import Parser from 'rss-parser';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const parser = new Parser();

const FASHION_RSS_FEEDS = [
  { source: 'Vogue', url: 'https://www.vogue.com/feed/rss' },
  { source: 'GQ', url: 'https://www.gq.com/feed/rss' },
  { source: 'Hypebeast', url: 'https://hypebeast.com/feed' },
];

export async function fetchTrends(): Promise<void> {
  for (const feed of FASHION_RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);

      const items = parsed.items.slice(0, 20).map((item) => ({
        source: feed.source,
        source_url: item.link ?? '',
        title: item.title ?? '',
        image_url: item.enclosure?.url ?? null,
        summary: item.contentSnippet?.slice(0, 300) ?? null,
        tags: extractTags(item.categories ?? []),
        aesthetic_tags: [],
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      })).filter((item) => item.source_url);

      // Upsert — source_url is the dedup key
      const { error } = await supabase
        .from('trend_items')
        .upsert(items, { onConflict: 'source_url', ignoreDuplicates: true });

      if (error) logger.error(`Failed to upsert trends from ${feed.source}`, { error });
      else logger.info(`Fetched ${items.length} trends from ${feed.source}`);
    } catch (err) {
      logger.error(`Failed to fetch RSS from ${feed.source}`, { error: err });
    }
  }
}

function extractTags(categories: string[]): string[] {
  return categories.map((c) => c.toLowerCase().trim()).filter(Boolean);
}
