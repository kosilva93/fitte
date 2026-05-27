import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabase';

export default function Index() {
  const { session } = useAuthStore();

  useEffect(() => {
    async function redirect() {
      const onboardingDone = await AsyncStorage.getItem('onboarding_complete');

      if (!onboardingDone) {
        router.replace('/onboarding');
        return;
      }

      if (!session) {
        router.replace('/(auth)/sign-in');
        return;
      }

      // Check if profile setup is complete for this user
      const { data } = await supabase
        .from('users')
        .select('profile_complete')
        .eq('id', session.user.id)
        .single();

      if (!data?.profile_complete) {
        router.replace('/profile-setup' as never);
      } else {
        router.replace('/(tabs)/wardrobe');
      }
    }

    redirect();
  }, [session]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#ffffff" />
    </View>
  );
}
