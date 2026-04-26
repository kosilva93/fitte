'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  // Step 1
  age: string;
  city: string;
  gender: string;
  body_type: string;
  // Step 2
  budget_max: string;
  aesthetics: string[];
  preferred_brands: string;
  // Step 3
  staple_items: string;
}

const INITIAL: ProfileData = {
  age: '',
  city: '',
  gender: '',
  body_type: '',
  budget_max: '',
  aesthetics: [],
  preferred_brands: '',
  staple_items: '',
};

// ─── Options ──────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: 'menswear', label: 'Menswear' },
  { value: 'womenswear', label: 'Womenswear' },
  { value: 'unisex', label: 'Unisex / Both' },
];

const BODY_TYPE_OPTIONS = [
  { value: 'slim', label: 'Slim', description: 'Narrow shoulders, lean frame' },
  { value: 'athletic', label: 'Athletic', description: 'Broad shoulders, defined waist' },
  { value: 'straight', label: 'Straight', description: 'Similar width shoulders and hips' },
  { value: 'broad', label: 'Broad', description: 'Wider shoulders or chest' },
  { value: 'curvy', label: 'Curvy', description: 'Defined waist, fuller hips or bust' },
];

const BUDGET_OPTIONS = [
  { value: '5000', label: 'Under $50' },
  { value: '15000', label: '$50 – $150' },
  { value: '30000', label: '$150 – $300' },
  { value: '99999', label: '$300+' },
];

const AESTHETIC_OPTIONS = [
  'Minimalist', 'Streetwear', 'Business Casual', 'Old Money',
  'Y2K', 'Bohemian', 'Athleisure', 'Smart Casual', 'Techwear',
  'Preppy', 'Vintage', 'Avant-garde',
];

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: ProfileData; onChange: (d: Partial<ProfileData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-2 block">How old are you?</label>
        <input
          type="number"
          placeholder="Age"
          value={data.age}
          onChange={(e) => onChange({ age: e.target.value })}
          className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-600"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Where are you based?</label>
        <input
          type="text"
          placeholder="City (e.g. New York, London)"
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-600"
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-3 block">Style identity</label>
        <div className="grid grid-cols-3 gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ gender: opt.value })}
              className={cn(
                'py-3 rounded-xl text-sm font-medium transition border',
                data.gender === opt.value
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-3 block">Body type</label>
        <div className="space-y-2">
          {BODY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ body_type: opt.value })}
              className={cn(
                'w-full flex justify-between items-center px-4 py-3 rounded-xl text-sm transition border',
                data.body_type === opt.value
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent border-gray-800 hover:border-gray-600'
              )}
            >
              <span className="font-medium">{opt.label}</span>
              <span className={cn('text-xs', data.body_type === opt.value ? 'text-gray-600' : 'text-gray-500')}>
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({ data, onChange }: { data: ProfileData; onChange: (d: Partial<ProfileData>) => void }) {
  function toggleAesthetic(value: string) {
    const current = data.aesthetics;
    if (current.includes(value)) {
      onChange({ aesthetics: current.filter((a) => a !== value) });
    } else if (current.length < 3) {
      onChange({ aesthetics: [...current, value] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-3 block">Budget per item</label>
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ budget_max: opt.value })}
              className={cn(
                'py-3 rounded-xl text-sm font-medium transition border',
                data.budget_max === opt.value
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-1 block">
          Aesthetic preferences
          <span className="ml-2 text-gray-600">Pick up to 3</span>
        </label>
        <div className="flex flex-wrap gap-2 mt-3">
          {AESTHETIC_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => toggleAesthetic(opt)}
              className={cn(
                'px-3 py-2 rounded-full text-sm transition border',
                data.aesthetics.includes(opt)
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:border-gray-600',
                !data.aesthetics.includes(opt) && data.aesthetics.length >= 3 && 'opacity-40 cursor-not-allowed'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Preferred brands <span className="text-gray-600">(optional)</span></label>
        <input
          type="text"
          placeholder="e.g. Zara, Nike, COS, Carhartt"
          value={data.preferred_brands}
          onChange={(e) => onChange({ preferred_brands: e.target.value })}
          className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-600"
        />
      </div>
    </div>
  );
}

function Step3({ data, onChange }: { data: ProfileData; onChange: (d: Partial<ProfileData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-2 block">
          Current staples <span className="text-gray-600">(optional)</span>
        </label>
        <p className="text-xs text-gray-600 mb-3">
          What pieces are always in your rotation? This helps us build outfits around what you already love.
        </p>
        <textarea
          placeholder="e.g. white tee, black jeans, white sneakers, navy bomber..."
          value={data.staple_items}
          onChange={(e) => onChange({ staple_items: e.target.value })}
          rows={4}
          className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-600 resize-none"
        />
      </div>

      <div className="bg-gray-900 rounded-xl p-4 text-sm text-gray-400">
        <p className="font-medium text-white mb-1">You're almost ready</p>
        <p>After this you'll be taken to your wardrobe to start adding items. The more you add, the better your outfit recommendations will be.</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { title: 'The Basics', subtitle: 'Tell us about yourself' },
  { title: 'Your Style', subtitle: 'Define your aesthetic' },
  { title: 'Your Wardrobe', subtitle: 'What do you already love?' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProfileData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function onChange(partial: Partial<ProfileData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function isStepValid() {
    if (step === 0) return data.age && data.city && data.gender && data.body_type;
    if (step === 1) return data.budget_max && data.aesthetics.length > 0;
    return true; // step 3 is optional
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — save profile
    setLoading(true);
    setError('');

    try {
      await apiPatch('/profile', {
        age: parseInt(data.age),
        city: data.city,
        gender: data.gender,
        body_type: data.body_type,
        budget_max: parseInt(data.budget_max),
        aesthetics: data.aesthetics,
        preferred_brands: data.preferred_brands
          ? data.preferred_brands.split(',').map((b) => b.trim()).filter(Boolean)
          : [],
        staple_items: data.staple_items
          ? data.staple_items.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        profile_complete: true,
      });

      router.push('/wardrobe');
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-500 text-sm mb-1">Step {step + 1} of {STEPS.length}</p>
          <h1 className="text-3xl font-bold">{STEPS[step].title}</h1>
          <p className="text-gray-400 mt-1">{STEPS[step].subtitle}</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-all',
                i <= step ? 'bg-white' : 'bg-gray-800'
              )}
            />
          ))}
        </div>

        {/* Step content */}
        {step === 0 && <Step1 data={data} onChange={onChange} />}
        {step === 1 && <Step2 data={data} onChange={onChange} />}
        {step === 2 && <Step3 data={data} onChange={onChange} />}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3 mt-10">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 border border-gray-800 text-white py-3 rounded-xl font-medium hover:border-gray-600 transition"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            className="flex-1 bg-white text-black py-3 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-40"
          >
            {loading ? 'Saving...' : step === STEPS.length - 1 ? 'Go to my wardrobe' : 'Continue'}
          </button>
        </div>

        {step === 2 && (
          <button
            onClick={() => router.push('/wardrobe')}
            className="w-full text-gray-600 text-sm mt-4 hover:text-gray-400 transition"
          >
            Skip for now
          </button>
        )}
      </div>
    </main>
  );
}
