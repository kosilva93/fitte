import { View, Text, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiGet } from '@/utils/api';
import { TrendItem } from '@/types';
import { router } from 'expo-router';

export default function TrendsScreen() {
  const { userTier } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiGet<{ trends: TrendItem[] }>('/trends'),
    enabled: userTier === 'premium',
  });

  if (userTier !== 'premium') {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Text className="text-white text-2xl font-bold mb-2">Trends</Text>
        <Text className="text-gray-400 text-center mb-6">
          Upgrade to Premium to access 2026 fashion trends from top publications and Pinterest.
        </Text>
        <TouchableOpacity
          className="bg-white rounded-xl px-6 py-3"
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text className="text-black font-semibold">Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 pt-16 pb-4">
        <Text className="text-white text-2xl font-bold">Trends</Text>
      </View>

      {isLoading ? (
        <Text className="text-gray-400 text-sm px-6">Loading trends...</Text>
      ) : (
        <View className="px-6 space-y-4">
          {(data?.trends ?? []).map((trend) => (
            <TouchableOpacity
              key={trend.id}
              onPress={() => Linking.openURL(trend.source_url)}
              className="bg-gray-900 rounded-xl overflow-hidden"
              activeOpacity={0.8}
            >
              {trend.image_url && (
                <Image
                  source={{ uri: trend.image_url }}
                  className="w-full h-44"
                  resizeMode="cover"
                />
              )}
              <View className="p-4">
                <Text className="text-gray-500 text-xs mb-1">{trend.source}</Text>
                <Text className="text-white text-sm font-medium leading-snug">{trend.title}</Text>
                {trend.summary && (
                  <Text className="text-gray-400 text-xs mt-2" numberOfLines={2}>
                    {trend.summary}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
