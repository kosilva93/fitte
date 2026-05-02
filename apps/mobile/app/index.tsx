import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { session } = useAuthStore();

  useEffect(() => {
    async function redirect() {
      const onboardingDone = await AsyncStorage.getItem('onboarding_complete');

      if (!onboardingDone) {
        router.replace('/onboarding');
      } else if (!session) {
        router.replace('/(auth)/sign-in');
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
