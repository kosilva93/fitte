import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { apiGet, apiPost } from '@/utils/api';
import { GapAnalysis } from '@/types';

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const BORDER_PURPLE = 'rgba(139,92,246,0.35)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE = '#8B5CF6';
const PURPLE_BRIGHT = '#A78BFA';

const CATEGORY_EMOJI: Record<string, string> = {
  top: '👕', bottom: '👖', shoes: '👟', outerwear: '🧥',
  accessory: '🧣', dress: '👗', suit: '🤵',
};

export default function GapsScreen() {
  const { userTier } = useAuthStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

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
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <StatusBar barStyle="light-content" />
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER_PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 32 }}>🔍</Text>
        </View>
        <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>Gap Analysis</Text>
        <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Upgrade to Pro to get AI-powered recommendations for items that will unlock the most new outfit combinations.
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={{ backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const analysis = data?.analysis;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      <View style={{
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 20,
      }}>
        <View>
          <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>Gap Analysis</Text>
          {analysis && (
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
              {analysis.wardrobe_size} items · {new Date(analysis.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => analyze()}
          disabled={isPending}
          activeOpacity={0.8}
          style={{
            backgroundColor: isPending ? SURFACE : PURPLE,
            borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}
        >
          {isPending && <ActivityIndicator size="small" color={PURPLE_BRIGHT} />}
          <Text style={{ color: isPending ? MUTED : '#fff', fontSize: 13, fontWeight: '600' }}>
            {isPending ? 'Analysing...' : analysis ? 'Re-analyse' : 'Analyse'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}>
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={PURPLE_BRIGHT} />
            <Text style={{ color: MUTED, fontSize: 13, marginTop: 12 }}>Loading analysis...</Text>
          </View>
        ) : !analysis ? (
          <View style={{ backgroundColor: SURFACE, borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: BORDER, marginTop: 8 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
            <Text style={{ color: TEXT, fontWeight: '600', fontSize: 16, marginBottom: 6 }}>No analysis yet</Text>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Tap "Analyse" to get personalised recommendations for your biggest wardrobe gaps.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER_PURPLE, marginTop: 4 }}>
              <Text style={{ color: MUTED, fontSize: 13, lineHeight: 20 }}>{analysis.summary}</Text>
            </View>

            {analysis.gaps.map((gap, i) => (
              <View key={i} style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[gap.category] ?? '🛍️'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: TEXT, fontWeight: '600', fontSize: 14, textTransform: 'capitalize', flex: 1, marginRight: 8 }}>
                        {gap.item}
                      </Text>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{gap.price_range}</Text>
                    </View>
                    <Text style={{ color: MUTED, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>{gap.why}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {gap.brands.map((brand) => (
                        <View key={brand} style={{ borderWidth: 1, borderColor: BORDER_PURPLE, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                          <Text style={{ color: PURPLE_BRIGHT, fontSize: 11 }}>{brand}</Text>
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
