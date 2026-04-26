'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiGet } from '@/lib/api';
import type { TrendItem } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

export default function TrendsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { userTier } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiGet<{ trends: TrendItem[] }>('/trends'),
    enabled: mounted && userTier === 'premium',
  });

  if (!mounted) return null;

  if (userTier !== 'premium') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <h1 className="text-2xl font-bold mb-2">Trends</h1>
        <p className="text-gray-400 max-w-sm mb-6">
          Upgrade to Premium to access 2026 fashion trends from top publications and Pinterest.
        </p>
        <Link
          href="/profile"
          className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
        >
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Trends</h1>
      {isLoading ? (
        <p className="text-gray-400">Loading trends...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.trends.map((trend) => (
            <a
              key={trend.id}
              href={trend.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition"
            >
              {trend.image_url && (
                <div className="relative aspect-video">
                  <Image src={trend.image_url} alt={trend.title} fill className="object-cover" />
                </div>
              )}
              <div className="p-4">
                <p className="text-gray-500 text-xs mb-1">{trend.source}</p>
                <p className="text-sm font-medium leading-snug">{trend.title}</p>
                {trend.summary && (
                  <p className="text-gray-400 text-xs mt-2 line-clamp-2">{trend.summary}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
