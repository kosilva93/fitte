import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

async function syncTier(userId: string, setUserTier: (t: 'free' | 'pro' | 'premium') => void) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, valid_until')
    .eq('user_id', userId)
    .single();
  const isActive = data?.valid_until ? new Date(data.valid_until) > new Date() : true;
  setUserTier((data?.tier && isActive) ? data.tier : 'free');
}

export default function RootLayout() {
  const { setSession, setUserTier } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) syncTier(session.user.id, setUserTier);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) syncTier(session.user.id, setUserTier);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUserTier]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
