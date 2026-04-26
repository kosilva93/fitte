'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    const raw = searchParams.get('redirect') ?? '';
    const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/wardrobe';
    router.push(redirect);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-400 mb-8">Sign in to your Fitte account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-600"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-gray-600"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
          No account?{' '}
          <Link href="/sign-up" className="text-white underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
