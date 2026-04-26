'use client';

import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

async function resolveAndStoreTier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  setUserTier: (tier: 'free' | 'pro' | 'premium') => void
) {
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier, valid_until')
    .eq('user_id', userId)
    .single();

  const isActive = sub?.valid_until ? new Date(sub.valid_until) > new Date() : true;
  setUserTier((sub?.tier && isActive) ? sub.tier : 'free');
}

export function Providers({ children }: { children: ReactNode }) {
  const { setSession, setUserTier } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) resolveAndStoreTier(supabase, session.user.id, setUserTier);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) resolveAndStoreTier(supabase, session.user.id, setUserTier);
      else setUserTier('free');
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUserTier]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
