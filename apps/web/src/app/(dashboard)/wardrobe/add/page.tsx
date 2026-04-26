'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ItemType, WardrobeItem } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_TYPES: { value: ItemType; label: string; emoji: string }[] = [
  { value: 'top', label: 'Top', emoji: '👕' },
  { value: 'bottom', label: 'Bottom', emoji: '👖' },
  { value: 'dress', label: 'Dress', emoji: '👗' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { value: 'accessory', label: 'Accessory', emoji: '🧣' },
  { value: 'suit', label: 'Suit', emoji: '🤵' },
];

const COLOR_OPTIONS = [
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'grey', label: 'Grey', hex: '#9CA3AF' },
  { value: 'navy', label: 'Navy', hex: '#1E3A5F' },
  { value: 'blue', label: 'Blue', hex: '#3B82F6' },
  { value: 'brown', label: 'Brown', hex: '#92400E' },
  { value: 'beige', label: 'Beige', hex: '#D4B896' },
  { value: 'camel', label: 'Camel', hex: '#C19A6B' },
  { value: 'green', label: 'Green', hex: '#16A34A' },
  { value: 'olive', label: 'Olive', hex: '#6B7C3A' },
  { value: 'red', label: 'Red', hex: '#DC2626' },
  { value: 'burgundy', label: 'Burgundy', hex: '#7F1D1D' },
  { value: 'pink', label: 'Pink', hex: '#EC4899' },
  { value: 'orange', label: 'Orange', hex: '#F97316' },
  { value: 'yellow', label: 'Yellow', hex: '#EAB308' },
  { value: 'purple', label: 'Purple', hex: '#9333EA' },
  { value: 'cream', label: 'Cream', hex: '#FFFDD0' },
  { value: 'multicolor', label: 'Multi', hex: 'linear-gradient(135deg, #f00, #0f0, #00f)' },
];

const SILHOUETTE_OPTIONS = [
  'Slim', 'Regular', 'Oversized', 'Relaxed', 'Tailored',
  'A-line', 'Straight', 'Wide-leg', 'Cropped', 'Longline',
];

const FABRIC_OPTIONS = [
  'Cotton', 'Denim', 'Linen', 'Wool', 'Cashmere',
  'Silk', 'Polyester', 'Nylon', 'Leather', 'Suede',
  'Knit', 'Jersey', 'Canvas', 'Fleece',
];

const SEASON_OPTIONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

const OCCASION_TAG_OPTIONS = [
  'Casual', 'Work', 'Formal', 'Smart Casual',
  'Active', 'Evening', 'Travel', 'Beach',
];

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormData {
  item_type: ItemType | '';
  label: string;
  brand: string;
  colors: string[];
  silhouette: string;
  fabric: string;
  season: string[];
  occasion_tags: string[];
}

const INITIAL: FormData = {
  item_type: '',
  label: '',
  brand: '',
  colors: [],
  silhouette: '',
  fabric: '',
  season: [],
  occasion_tags: [],
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AddItemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(partial: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function toggleArray(key: keyof FormData, value: string) {
    const current = form[key] as string[];
    update({
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  const { mutate: addItem, isPending, error } = useMutation({
    mutationFn: async () => {
      let photoPath: string | undefined;

      if (photoFile) {
        const { uploadUrl, path } = await apiPost<{ uploadUrl: string; path: string }>(
          '/wardrobe/upload-url',
          {}
        );
        await fetch(uploadUrl, {
          method: 'PUT',
          body: photoFile,
          headers: { 'Content-Type': photoFile.type },
        });
        photoPath = path;
      }

      return apiPost<{ item: WardrobeItem }>('/wardrobe/items', {
        item_type: form.item_type,
        label: form.label || undefined,
        brand: form.brand || undefined,
        colors: form.colors,
        silhouette: form.silhouette || undefined,
        fabric: form.fabric || undefined,
        season: form.season,
        occasion_tags: form.occasion_tags,
        photo_path: photoPath,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      router.push('/wardrobe');
    },
  });

  const isValid = form.item_type && form.colors.length > 0;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-white transition text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Add Item</h1>
      </div>

      {/* Photo Upload */}
      <Section title="Photo (optional)">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
        {photoPreview ? (
          <div className="relative w-full aspect-square max-w-xs rounded-xl overflow-hidden bg-gray-900">
            <Image src={photoPreview} alt="Preview" fill className="object-cover" />
            <button
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg hover:bg-black transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition',
              dragOver ? 'border-gray-500 bg-gray-900' : 'border-gray-800 hover:border-gray-600'
            )}
          >
            <p className="text-gray-500 text-sm">Drop a photo here or <span className="text-white underline">browse</span></p>
            <p className="text-gray-600 text-xs mt-1">JPG, PNG, WEBP — used for AI classification</p>
          </div>
        )}
      </Section>

      {/* Item Type */}
      <Section title="Type *">
        <div className="grid grid-cols-4 gap-2">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ item_type: t.value })}
              className={cn(
                'flex flex-col items-center gap-1 py-3 rounded-xl border text-sm transition',
                form.item_type === t.value
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              <span className="text-xl">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Colors */}
      <Section title="Color(s) *">
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleArray('colors', c.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full text-xs border transition',
                form.colors.includes(c.value)
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              <span
                className="w-3 h-3 rounded-full border border-gray-700 inline-block"
                style={{ background: c.hex }}
              />
              {c.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Label & Brand */}
      <Section title="Details">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Name / Label</label>
            <input
              placeholder="e.g. White Oxford Shirt"
              value={form.label}
              onChange={(e) => update({ label: e.target.value })}
              className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-700 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Brand</label>
            <input
              placeholder="e.g. Zara, Nike, COS"
              value={form.brand}
              onChange={(e) => update({ brand: e.target.value })}
              className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-700 text-sm"
            />
          </div>
        </div>
      </Section>

      {/* Silhouette */}
      <Section title="Silhouette">
        <div className="flex flex-wrap gap-2">
          {SILHOUETTE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => update({ silhouette: form.silhouette === s ? '' : s })}
              className={cn(
                'px-3 py-2 rounded-full text-xs border transition',
                form.silhouette === s
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* Fabric */}
      <Section title="Fabric">
        <div className="flex flex-wrap gap-2">
          {FABRIC_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => update({ fabric: form.fabric === f ? '' : f })}
              className={cn(
                'px-3 py-2 rounded-full text-xs border transition',
                form.fabric === f
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Section>

      {/* Season */}
      <Section title="Season">
        <div className="grid grid-cols-4 gap-2">
          {SEASON_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleArray('season', s)}
              className={cn(
                'py-2 rounded-xl text-sm border transition',
                form.season.includes(s)
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* Occasion Tags */}
      <Section title="Occasions">
        <div className="flex flex-wrap gap-2">
          {OCCASION_TAG_OPTIONS.map((o) => (
            <button
              key={o}
              onClick={() => toggleArray('occasion_tags', o)}
              className={cn(
                'px-3 py-2 rounded-full text-xs border transition',
                form.occasion_tags.includes(o)
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </Section>

      {error && (
        <div className="mb-4">
          {error instanceof Error && error.message.includes('Free tier limit') ? (
            <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
              <p className="text-white text-sm font-medium mb-1">Wardrobe limit reached</p>
              <p className="text-gray-400 text-sm mb-3">
                Free accounts can store up to 10 items. Upgrade to Pro for unlimited items.
              </p>
              <a
                href="/profile"
                className="inline-block bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition"
              >
                Upgrade to Pro
              </a>
            </div>
          ) : (
            <p className="text-red-400 text-sm">
              {error instanceof Error ? error.message : 'Failed to add item'}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pb-12">
        <button
          onClick={() => router.back()}
          className="flex-1 border border-gray-800 text-white py-3 rounded-xl font-medium hover:border-gray-600 transition"
        >
          Cancel
        </button>
        <button
          onClick={() => addItem()}
          disabled={!isValid || isPending}
          className="flex-1 bg-white text-black py-3 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-40"
        >
          {isPending ? 'Adding...' : 'Add to Wardrobe'}
        </button>
      </div>
    </div>
  );
}
