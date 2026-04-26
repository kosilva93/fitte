'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { apiGet, apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types';

const TIER_LABELS = { free: 'Free', pro: 'Pro', premium: 'Premium' };

const BODY_TYPE_OPTIONS = ['slim', 'athletic', 'straight', 'broad', 'curvy'];
const GENDER_OPTIONS = [
  { value: 'menswear', label: 'Menswear' },
  { value: 'womenswear', label: 'Womenswear' },
  { value: 'unisex', label: 'Unisex' },
];
const AESTHETIC_OPTIONS = [
  'Minimalist', 'Streetwear', 'Business Casual', 'Old Money',
  'Y2K', 'Bohemian', 'Athleisure', 'Smart Casual', 'Techwear',
  'Preppy', 'Vintage', 'Avant-garde',
];
const BUDGET_OPTIONS = [
  { value: 5000, label: 'Under $50' },
  { value: 15000, label: '$50 – $150' },
  { value: 30000, label: '$150 – $300' },
  { value: 99999, label: '$300+' },
];

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, userTier, signOut } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<{ profile: UserProfile & { gender?: string; body_type?: string; aesthetics?: string[] } }>('/profile'),
    enabled: mounted,
  });

  const profile = data?.profile;

  const [form, setForm] = useState({
    age: '',
    city: '',
    gender: '',
    body_type: '',
    budget_max: '',
    aesthetics: [] as string[],
    preferred_brands: '',
    staple_items: '',
  });

  // Populate form when profile loads
  useEffect(() => {
    if (!profile) return;
    setForm({
      age: profile.age?.toString() ?? '',
      city: profile.city ?? '',
      gender: (profile as any).gender ?? '',
      body_type: (profile as any).body_type ?? '',
      budget_max: profile.budget_max?.toString() ?? '',
      aesthetics: (profile as any).aesthetics ?? [],
      preferred_brands: profile.preferred_brands?.join(', ') ?? '',
      staple_items: profile.staple_items?.join(', ') ?? '',
    });
  }, [profile]);

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () => apiPatch('/profile', {
      age: form.age ? parseInt(form.age) : undefined,
      city: form.city || undefined,
      gender: form.gender || undefined,
      body_type: form.body_type || undefined,
      budget_max: form.budget_max ? parseInt(form.budget_max) : undefined,
      aesthetics: form.aesthetics,
      preferred_brands: form.preferred_brands
        ? form.preferred_brands.split(',').map((b) => b.trim()).filter(Boolean)
        : [],
      staple_items: form.staple_items
        ? form.staple_items.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function toggleAesthetic(value: string) {
    setForm((prev) => ({
      ...prev,
      aesthetics: prev.aesthetics.includes(value)
        ? prev.aesthetics.filter((a) => a !== value)
        : prev.aesthetics.length < 3 ? [...prev.aesthetics, value] : prev.aesthetics,
    }));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    signOut();
    router.push('/');
  }

  if (!mounted) return null;

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-4 py-2 rounded-xl transition"
          >
            Edit
          </button>
        )}
      </div>

      {saved && (
        <div className="bg-gray-900 border border-gray-700 text-green-400 text-sm px-4 py-3 rounded-xl mb-6">
          Profile updated successfully.
        </div>
      )}

      {/* Account info — never editable here */}
      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Email</p>
        <p className="text-white">{user?.email}</p>
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Subscription</p>
        <p className="text-white font-semibold">{mounted ? TIER_LABELS[userTier] : '—'}</p>
        {mounted && userTier === 'free' && (
          <p className="text-gray-500 text-xs mt-1">Upgrade to Pro for unlimited outfits and gap analysis.</p>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading profile...</p>
      ) : editing ? (
        <div className="space-y-6">
          {/* Age & City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-700"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-700"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Style identity</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setForm((p) => ({ ...p, gender: opt.value }))}
                  className={cn('py-2 rounded-xl text-sm border transition',
                    form.gender === opt.value ? 'bg-white text-black border-white' : 'text-gray-400 border-gray-800 hover:border-gray-600')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body type */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Body type</label>
            <div className="grid grid-cols-5 gap-2">
              {BODY_TYPE_OPTIONS.map((bt) => (
                <button key={bt} onClick={() => setForm((p) => ({ ...p, body_type: bt }))}
                  className={cn('py-2 rounded-xl text-xs border transition capitalize',
                    form.body_type === bt ? 'bg-white text-black border-white' : 'text-gray-400 border-gray-800 hover:border-gray-600')}>
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Budget per item</label>
            <div className="grid grid-cols-4 gap-2">
              {BUDGET_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setForm((p) => ({ ...p, budget_max: opt.value.toString() }))}
                  className={cn('py-2 rounded-xl text-xs border transition',
                    form.budget_max === opt.value.toString() ? 'bg-white text-black border-white' : 'text-gray-400 border-gray-800 hover:border-gray-600')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aesthetics */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Aesthetics <span className="text-gray-600">(up to 3)</span></label>
            <div className="flex flex-wrap gap-2">
              {AESTHETIC_OPTIONS.map((a) => (
                <button key={a} onClick={() => toggleAesthetic(a)}
                  className={cn('px-3 py-1.5 rounded-full text-xs border transition',
                    form.aesthetics.includes(a) ? 'bg-white text-black border-white' : 'text-gray-400 border-gray-800 hover:border-gray-600',
                    !form.aesthetics.includes(a) && form.aesthetics.length >= 3 && 'opacity-40 cursor-not-allowed')}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Brands & Staples */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Preferred brands</label>
            <input type="text" placeholder="e.g. Zara, Nike, COS" value={form.preferred_brands}
              onChange={(e) => setForm((p) => ({ ...p, preferred_brands: e.target.value }))}
              className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Wardrobe staples</label>
            <input type="text" placeholder="e.g. white tee, black jeans" value={form.staple_items}
              onChange={(e) => setForm((p) => ({ ...p, staple_items: e.target.value }))}
              className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-700" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditing(false)}
              className="flex-1 border border-gray-800 text-white py-3 rounded-xl text-sm font-medium hover:border-gray-600 transition">
              Cancel
            </button>
            <button onClick={() => saveProfile()} disabled={isPending}
              className="flex-1 bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-gray-100 transition disabled:opacity-40">
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        /* Read-only view */
        <div className="space-y-3">
          {[
            { label: 'Age', value: profile?.age },
            { label: 'City', value: profile?.city },
            { label: 'Style identity', value: (profile as any)?.gender },
            { label: 'Body type', value: (profile as any)?.body_type },
            { label: 'Aesthetics', value: (profile as any)?.aesthetics?.join(', ') },
            { label: 'Preferred brands', value: profile?.preferred_brands?.join(', ') },
            { label: 'Staples', value: profile?.staple_items?.join(', ') },
          ].map(({ label, value }) => value ? (
            <div key={label} className="bg-gray-900 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="text-white text-sm capitalize">{String(value)}</span>
            </div>
          ) : null)}
        </div>
      )}

      <button onClick={handleSignOut}
        className="w-full border border-gray-800 text-gray-500 hover:text-white font-medium py-3 rounded-xl hover:border-gray-600 transition mt-8 text-sm">
        Sign Out
      </button>
    </div>
  );
}
