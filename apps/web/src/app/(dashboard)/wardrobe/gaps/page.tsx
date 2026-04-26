'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiGet, apiPost } from '@/lib/api';
import Link from 'next/link';

interface GapItem {
  item: string;
  category: string;
  why: string;
  price_range: string;
  brands: string[];
}

interface GapAnalysis {
  id: string;
  gaps: GapItem[];
  summary: string;
  wardrobe_size: number;
  updated_at: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  top: '👕', bottom: '👖', shoes: '👟', outerwear: '🧥',
  accessory: '🧣', dress: '👗', suit: '🤵',
};

export default function GapsPage() {
  const { userTier } = useAuthStore();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ['gaps'],
    queryFn: () => apiGet<{ analysis: GapAnalysis | null }>('/gaps'),
    enabled: mounted && (userTier === 'pro' || userTier === 'premium'),
  });

  const { mutate: analyze, isPending } = useMutation({
    mutationFn: () => apiPost<{ analysis: GapAnalysis }>('/gaps/analyze', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gaps'] }),
  });

  if (!mounted) return null;

  if (userTier === 'free') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <h1 className="text-2xl font-bold mb-2">Gap Analysis</h1>
        <p className="text-gray-400 max-w-sm mb-6">
          Upgrade to Pro to get AI-powered recommendations for the items that will
          unlock the most new outfit combinations from your existing wardrobe.
        </p>
        <Link
          href="/profile"
          className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  const analysis = data?.analysis;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gap Analysis</h1>
          {analysis && (
            <p className="text-gray-500 text-sm mt-1">
              Based on {analysis.wardrobe_size} items ·{' '}
              {new Date(analysis.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <button
          onClick={() => analyze()}
          disabled={isPending}
          className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
        >
          {isPending ? 'Analysing...' : analysis ? 'Re-analyse' : 'Analyse Wardrobe'}
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : !analysis ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-4">🔍</p>
          <p className="text-white font-semibold mb-2">No analysis yet</p>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Click "Analyse Wardrobe" to get personalised recommendations for your biggest wardrobe gaps.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-gray-400 text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Gap cards */}
          <div className="space-y-3">
            {analysis.gaps.map((gap, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{CATEGORY_EMOJI[gap.category] ?? '🛍️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-white font-semibold text-sm capitalize">{gap.item}</p>
                      <span className="text-gray-500 text-xs whitespace-nowrap">{gap.price_range}</span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed mb-3">{gap.why}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {gap.brands.map((brand) => (
                        <span
                          key={brand}
                          className="text-xs border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
