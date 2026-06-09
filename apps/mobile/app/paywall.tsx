import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabase';

const ENTITLEMENT_ID = 'Fitte.ai Pro';

export default function PaywallScreen() {
  const { setUserTier } = useAuthStore();

  useEffect(() => {
    showPaywall();
  }, []);

  async function showPaywall() {
    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        router.replace('/(tabs)/wardrobe');
        return;
      }
      const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await onSubscribed();
      } else {
        router.replace('/(tabs)/wardrobe');
      }
    } catch {
      router.replace('/(tabs)/wardrobe');
    }
  }

  async function onSubscribed() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isActive = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      if (isActive) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const validUntil = new Date();
          validUntil.setFullYear(validUntil.getFullYear() + 1);
          await supabase.from('user_subscriptions').upsert({
            user_id: session.user.id,
            tier: 'pro',
            valid_until: validUntil.toISOString(),
          });
        }
        setUserTier('pro');
      }
    } catch {
      // Non-fatal
    }
    router.replace('/(tabs)/wardrobe');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#060912', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#8B5CF6" size="large" />
    </View>
  );
}
