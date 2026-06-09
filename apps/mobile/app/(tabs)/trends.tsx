import { View, Text, ScrollView, TouchableOpacity, Image, Linking, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { apiGet } from '@/utils/api';
import { TrendItem } from '@/types';
import { router } from 'expo-router';

const BG = '#060912';
const SURFACE = '#0B1020';
const BORDER = 'rgba(255,255,255,0.10)';
const BORDER_PURPLE = 'rgba(139,92,246,0.35)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE = '#8B5CF6';

export default function TrendsScreen() {
  const { userTier } = useAuthStore();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiGet<{ trends: TrendItem[] }>('/trends'),
    enabled: userTier === 'premium',
  });

  if (userTier !== 'premium') {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <StatusBar barStyle="light-content" />
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER_PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 32 }}>✨</Text>
        </View>
        <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>Trends</Text>
        <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Upgrade to Premium to access 2026 fashion trends from top publications and Pinterest.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={{ backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 150 }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 20 }}>
        <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>Trends</Text>
      </View>

      {isLoading ? (
        <Text style={{ color: MUTED, fontSize: 13, paddingHorizontal: 20 }}>Loading trends...</Text>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {(data?.trends ?? []).map((trend) => (
            <TouchableOpacity
              key={trend.id}
              onPress={() => Linking.openURL(trend.source_url)}
              activeOpacity={0.8}
              style={{ backgroundColor: SURFACE, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: BORDER }}
            >
              {trend.image_url && (
                <Image source={{ uri: trend.image_url }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
              )}
              <View style={{ padding: 16 }}>
                <Text style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>{trend.source}</Text>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '600', lineHeight: 20 }}>{trend.title}</Text>
                {trend.summary && (
                  <Text style={{ color: MUTED, fontSize: 12, marginTop: 6, lineHeight: 18 }} numberOfLines={2}>
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
