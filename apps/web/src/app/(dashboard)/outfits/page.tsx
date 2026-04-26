'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { GeneratedOutfit } from '@/types';

interface OutfitRequest {
  occasion: string;
  vibe: string;
  venue?: string;
  time_of_day?: string;
  generation_round: number;
}

const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night'];

const VIBE_SUGGESTIONS = [
  'Casual', 'Sharp', 'Relaxed', 'Bold', 'Understated',
  'Romantic', 'Edgy', 'Polished', 'Playful', 'Minimal',
];

function OutfitGenerator({ onGenerated }: { onGenerated: (outfits: GeneratedOutfit[]) => void }) {
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [venue, setVenue] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  const { mutate: generate, isPending, error } = useMutation({
    mutationFn: (req: OutfitRequest) =>
      apiPost<{ outfits: GeneratedOutfit[] }>('/outfits/generate', req),
    onSuccess: (data) => onGenerated(data.outfits),
  });

  function handleGenerate() {
    generate({
      occasion,
      vibe,
      venue: venue || undefined,
      time_of_day: timeOfDay || undefined,
      generation_round: 1,
    });
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 mb-8">
      <h2 className="font-semibold text-lg mb-5">What are you dressing for?</h2>

      <div className="mb-4">
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Occasion <span className="text-red-400">*</span>
        </label>
        <input
          placeholder="e.g. dinner, work meeting, first date, beach day..."
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          className="w-full bg-black text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-700 text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Vibe <span className="text-red-400">*</span>
        </label>
        <input
          placeholder="How do you want to feel?"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          className="w-full bg-black text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-700 text-sm mb-2"
        />
        <div className="flex flex-wrap gap-2">
          {VIBE_SUGGESTIONS.map((v) => (
            <button
              key={v}
              onClick={() => setVibe(v)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs transition border',
                vibe === v
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-600'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowOptional((v) => !v)}
        className="text-xs text-gray-500 hover:text-gray-300 transition mb-4"
      >
        {showOptional ? '− Hide' : '+ Add'} venue & time of day
      </button>

      {showOptional && (
        <div className="space-y-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Venue</label>
            <input
              placeholder="e.g. rooftop bar, office, art gallery..."
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-black text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-700 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Time of day</label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeOfDay(timeOfDay === t ? '' : t)}
                  className={cn(
                    'py-2 rounded-xl text-sm transition border',
                    timeOfDay === t
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-500 border-gray-800 hover:border-gray-600'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mb-4">
          {error instanceof Error ? error.message : 'Something went wrong'}
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={isPending || !occasion || !vibe}
        className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-100 transition disabled:opacity-40 text-sm"
      >
        {isPending ? 'Building your outfits...' : 'Generate Outfits'}
      </button>
    </div>
  );
}

function OutfitCard({
  outfit,
  onSave,
  onFeedback,
}: {
  outfit: GeneratedOutfit;
  onSave?: (id: string) => void;
  onFeedback?: (id: string, feedback: 'loved' | 'disliked') => void;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-white font-medium capitalize">{outfit.occasion}</span>
          {outfit.vibe && (
            <span className="text-gray-500 text-sm ml-2">· {outfit.vibe}</span>
          )}
        </div>
        {outfit.color_logic && (
          <span className="text-gray-600 text-xs capitalize">{outfit.color_logic}</span>
        )}
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">{outfit.description}</p>

      <div className="flex items-center gap-3 mt-4">
        {onSave && !outfit.saved && (
          <button
            onClick={() => onSave(outfit.id)}
            className="text-xs text-gray-500 hover:text-white transition border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded-full"
          >
            Save to lookbook
          </button>
        )}
        {outfit.saved && (
          <span className="text-xs text-gray-600">Saved ✓</span>
        )}

        {onFeedback && (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => onFeedback(outfit.id, 'loved')}
              className={cn(
                'text-sm px-2 py-1 rounded-lg transition',
                outfit.feedback === 'loved'
                  ? 'bg-green-900/50 text-green-400'
                  : 'text-gray-600 hover:text-white'
              )}
              title="Love it"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(outfit.id, 'disliked')}
              className={cn(
                'text-sm px-2 py-1 rounded-lg transition',
                outfit.feedback === 'disliked'
                  ? 'bg-red-900/50 text-red-400'
                  : 'text-gray-600 hover:text-white'
              )}
              title="Not for me"
            >
              👎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OutfitsPage() {
  const queryClient = useQueryClient();
  const [generated, setGenerated] = useState<GeneratedOutfit[]>([]);

  const { data: lookbook } = useQuery({
    queryKey: ['outfits'],
    queryFn: () => apiGet<{ outfits: GeneratedOutfit[] }>('/outfits'),
  });

  const { mutate: saveOutfit } = useMutation({
    mutationFn: (id: string) => apiPatch(`/outfits/${id}`, { saved: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  const { mutate: sendFeedback } = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: 'loved' | 'disliked' }) =>
      apiPatch(`/outfits/${id}`, { feedback }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  function handleSave(id: string) {
    saveOutfit(id);
    setGenerated((prev) => prev.map((o) => o.id === id ? { ...o, saved: true } : o));
  }

  function handleFeedback(id: string, feedback: 'loved' | 'disliked') {
    sendFeedback({ id, feedback });
    setGenerated((prev) =>
      prev.map((o) => o.id === id ? { ...o, feedback } : o)
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Outfits</h1>

      <OutfitGenerator onGenerated={setGenerated} />

      {generated.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-4">Generated</h2>
          <div className="space-y-4">
            {generated.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onSave={handleSave}
                onFeedback={handleFeedback}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-4">Saved Lookbook</h2>
        {(lookbook?.outfits ?? []).length === 0 ? (
          <p className="text-gray-600 text-sm">No saved outfits yet.</p>
        ) : (
          <div className="space-y-4">
            {lookbook?.outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={{ ...outfit, saved: true }}
                onFeedback={handleFeedback}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
