import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiGet, apiPost } from '@/utils/api';
import { GapAnalysis } from '@/types';

const CATEGORY_EMOJI: Record<string, string> = {
  top: '👕', bottom: '👖', shoes: '👟', outerwear: '🧥',
  accessory: '🧣', dress: '👗', suit: '🤵',
};

export default function GapsScreen() {
  const { userTier } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['gaps'],
    queryFn: () => apiGet<{ analysis: GapAnalysis | null }>('/gaps'),
    enabled: userTier === 'pro' || userTier === 'premium',
  });

  const { mutate: analyze, isPending } = useMutation({
    mutationFn: () => apiPost<{ analysis: GapAnalysis }>('/gaps/analyze', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gaps'] }),
  });

  if (userTier === 'free') {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Text className="text-white text-xl font-bold mb-2">Gap Analysis</Text>
        <Text className="text-gray-400 text-center mb-6">
          Upgrade to Pro to get AI-powered recommendations for the items that will unlock the most new outfit combinations.
        </Text>
        <TouchableOpacity className="bg-white rounded-xl px-6 py-3">
          <Text className="text-black font-semibold">Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const analysis = data?.analysis;

  return (
    <View className="flex-1 bg-black">
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Gap Analysis</Text>
          {analysis && (
            <Text className="text-gray-500 text-xs mt-0.5">
              {analysis.wardrobe_size} items ·{' '}
              {new Date(analysis.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => analyze()}
          disabled={isPending}
          className="bg-white rounded-xl px-4 py-2"
        >
          <Text className="text-black text-sm font-semibold">
            {isPending ? 'Analysing...' : analysis ? 'Re-analyse' : 'Analyse'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6">
        {isLoading ? (
          <Text className="text-gray-500 text-sm mt-4">Loading...</Text>
        ) : !analysis ? (
          <View className="bg-gray-900 rounded-2xl p-8 items-center mt-4">
            <Text className="text-3xl mb-3">🔍</Text>
            <Text className="text-white font-semibold mb-2">No analysis yet</Text>
            <Text className="text-gray-400 text-sm text-center">
              Tap "Analyse" to get personalised recommendations for your biggest wardrobe gaps.
            </Text>
          </View>
        ) : (
          <View className="space-y-4 pb-8">
            <View className="bg-gray-900 rounded-xl p-4 mt-2">
              <Text className="text-gray-400 text-sm leading-relaxed">{analysis.summary}</Text>
            </View>

            {analysis.gaps.map((gap, i) => (
              <View key={i} className="bg-gray-900 rounded-xl p-4">
                <View className="flex-row gap-3">
                  <Text className="text-2xl">{CATEGORY_EMOJI[gap.category] ?? '🛍️'}</Text>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-white font-semibold text-sm capitalize flex-1 mr-2">
                        {gap.item}
                      </Text>
                      <Text className="text-gray-500 text-xs">{gap.price_range}</Text>
                    </View>
                    <Text className="text-gray-400 text-xs leading-relaxed mb-3">{gap.why}</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {gap.brands.map((brand) => (
                        <View
                          key={brand}
                          className="border border-gray-700 rounded-full px-2 py-0.5"
                        >
                          <Text className="text-gray-400 text-xs">{brand}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
