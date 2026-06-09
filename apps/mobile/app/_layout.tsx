import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
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
    let purchases: typeof import('react-native-purchases').default | null = null;
    const rcKey = Platform.OS === 'ios'
      ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '')
      : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '');
    async function configurePurchases() {
      if (!rcKey) return;
      try {
        const purchasesModule = await import('react-native-purchases');
        purchases = purchasesModule.default;
        purchases.setLogLevel(purchasesModule.LOG_LEVEL.VERBOSE);
        purchases.configure({ apiKey: rcKey });
        const { data: { session } } = await supabase.auth.getSession();
        if (session) purchases.logIn(session.user.id).catch(() => {});
      } catch {
        // Non-fatal — app works without RevenueCat
      }
    }

    configurePurchases();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        syncTier(session.user.id, setUserTier);
        if (purchases) purchases.logIn(session.user.id).catch(() => {});
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        syncTier(session.user.id, setUserTier);
        if (purchases) purchases.logIn(session.user.id).catch(() => {});
      } else {
        if (purchases) purchases.logOut().catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUserTier]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="paywall" />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
