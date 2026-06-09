import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  ActivityIndicator, Alert, Modal, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { apiGet, apiPost, apiPatch } from '@/utils/api';
import { GeneratedOutfit, RecommendedItem, WardrobeItem } from '@/types';

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const BORDER_PURPLE = 'rgba(139,92,246,0.35)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE_BRIGHT = '#A78BFA';
const PURPLE = '#8B5CF6';

const VIBE_SUGGESTIONS = [
  'Casual', 'Sharp', 'Relaxed', 'Bold', 'Understated',
  'Romantic', 'Edgy', 'Polished', 'Playful', 'Minimal',
];

const WMO_CONDITION: Record<number, string> = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain',
  71: 'Light snow', 73: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm',
};

function weatherEmoji(code: number): string {
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

interface Weather { temp_c: number; condition: string; emoji: string }

async function fetchWeather(): Promise<Weather | null> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
          const json = await res.json();
          const code: number = json.current?.weather_code ?? 0;
          resolve({ temp_c: Math.round(json.current?.temperature_2m ?? 0), condition: WMO_CONDITION[code] ?? 'Clear', emoji: weatherEmoji(code) });
        } catch { resolve(null); }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}

function OutfitCollage({ outfit, wardrobeItems, size = 120 }: { outfit: GeneratedOutfit; wardrobeItems: WardrobeItem[]; size?: number }) {
  const half = size / 2;
  if (outfit.image_url) {
    return <Image source={{ uri: outfit.image_url }} style={{ width: size, height: size }} resizeMode="cover" />;
  }
  const items = (outfit.item_ids ?? []).slice(0, 4).map(id => wardrobeItems.find(i => i.id === id)).filter(Boolean) as WardrobeItem[];
  if (items.length === 0) {
    return (
      <View style={{ width: size, height: size, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: PURPLE_BRIGHT, fontSize: 28 }}>✨</Text>
      </View>
    );
  }
  const cells = Array.from({ length: 4 }, (_, i) => items[i] ?? null);
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap' }}>
      {cells.map((item, i) => (
        <View key={i} style={{ width: half, height: half, backgroundColor: SURFACE_SOFT }}>
          {item?.photo_thumbnail_url ? (
            <Image source={{ uri: item.photo_thumbnail_url }} style={{ width: half, height: half }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: half * 0.35 }}>👔</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function OutfitCard({
  outfit, wardrobeItems, onSave, onDelete, onFeedback, onVisualize, onFullscreen, isVisualizing,
}: {
  outfit: GeneratedOutfit;
  wardrobeItems: WardrobeItem[];
  onSave?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFeedback?: (id: string, feedback: 'loved' | 'disliked') => void;
  onVisualize?: (id: string) => void;
  onFullscreen?: (url: string) => void;
  isVisualizing?: boolean;
}) {
  const ownedItems = (outfit.item_ids ?? []).map(id => wardrobeItems.find(i => i.id === id)).filter(Boolean) as WardrobeItem[];
  const recommended = (outfit.recommended_items ?? []) as RecommendedItem[];

  return (
    <View style={{ backgroundColor: SURFACE, borderRadius: 20, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: BORDER }}>

      {/* Section 1 — top row: image + description */}
      <View style={{ flexDirection: 'row' }}>

        {/* Image */}
        <TouchableOpacity
          onPress={() => outfit.image_url ? onFullscreen?.(outfit.image_url) : undefined}
          activeOpacity={outfit.image_url ? 0.85 : 1}
          style={{ width: 130 }}
        >
          {outfit.image_url || (outfit.item_ids?.length ?? 0) > 0 ? (
            <OutfitCollage outfit={outfit} wardrobeItems={wardrobeItems} size={130} />
          ) : onVisualize ? (
            <TouchableOpacity
              onPress={() => onVisualize(outfit.id)}
              disabled={isVisualizing}
              activeOpacity={0.8}
              style={{ width: 130, height: 130, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' }}
            >
              {isVisualizing ? <ActivityIndicator color={PURPLE_BRIGHT} /> : (
                <>
                  <Text style={{ color: PURPLE_BRIGHT, fontSize: 22 }}>✨</Text>
                  <Text style={{ color: MUTED, fontSize: 9, marginTop: 4, textAlign: 'center' }}>Tap to visualise</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 130, height: 130, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28 }}>✨</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Description + actions */}
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700', marginBottom: 3 }} numberOfLines={2}>
            {outfit.occasion}
          </Text>
          {outfit.vibe ? (
            <Text style={{ color: PURPLE_BRIGHT, fontSize: 11, marginBottom: 6 }} numberOfLines={1}>{outfit.vibe}</Text>
          ) : null}
          {outfit.description ? (
            <Text style={{ color: MUTED, fontSize: 12, lineHeight: 17, flex: 1 }} numberOfLines={4}>
              {outfit.description}
            </Text>
          ) : null}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            {onFeedback && (
              <>
                <TouchableOpacity
                  onPress={() => onFeedback(outfit.id, 'loved')}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: outfit.feedback === 'loved' ? 'rgba(20,83,45,0.5)' : SURFACE_SOFT }}
                >
                  <Text style={{ fontSize: 12 }}>👍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onFeedback(outfit.id, 'disliked')}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: outfit.feedback === 'disliked' ? 'rgba(127,29,29,0.5)' : SURFACE_SOFT }}
                >
                  <Text style={{ fontSize: 12 }}>👎</Text>
                </TouchableOpacity>
              </>
            )}
            {onSave && !outfit.saved && (
              <TouchableOpacity
                onPress={() => onSave(outfit.id)}
                activeOpacity={0.7}
                style={{ marginLeft: 'auto', borderWidth: 1, borderColor: BORDER_PURPLE, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <Text style={{ color: PURPLE_BRIGHT, fontSize: 11 }}>Save</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(outfit.id)}
                activeOpacity={0.7}
                style={{ marginLeft: 'auto', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <Text style={{ color: MUTED, fontSize: 11 }}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Section 2 — bottom: items from wardrobe + what to buy */}
      {(ownedItems.length > 0 || recommended.length > 0) && (
        <View style={{ borderTopWidth: 1, borderTopColor: BORDER, padding: 14 }}>

          {ownedItems.length > 0 && (
            <View style={{ marginBottom: recommended.length > 0 ? 12 : 0 }}>
              <Text style={{ color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>From your wardrobe</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ownedItems.map(item => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: SURFACE_SOFT, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: BORDER }}>
                    {item.photo_thumbnail_url ? (
                      <Image source={{ uri: item.photo_thumbnail_url }} style={{ width: 18, height: 18, borderRadius: 4 }} resizeMode="cover" />
                    ) : null}
                    <Text style={{ color: TEXT, fontSize: 11 }} numberOfLines={1}>{item.label ?? item.item_type}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {recommended.length > 0 && (
            <View>
              <Text style={{ color: PURPLE_BRIGHT, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>What to get</Text>
              <View style={{ gap: 8 }}>
                {recommended.map((r, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SURFACE_SOFT, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: TEXT, fontSize: 12, fontWeight: '500' }} numberOfLines={1}>{r.description}</Text>
                      {r.brands?.length ? (
                        <Text style={{ color: MUTED, fontSize: 10, marginTop: 1 }} numberOfLines={1}>{r.brands.slice(0, 2).join(', ')}</Text>
                      ) : null}
                    </View>
                    <Text style={{ color: PURPLE_BRIGHT, fontSize: 11, fontWeight: '600' }}>{r.price_range}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

    </View>
  );
}

export default function OutfitsScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'looks' | 'create'>(tab === 'saved' ? 'looks' : 'create');
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all');

  // Generate form state
  const [occasion, setOccasion] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [customVibe, setCustomVibe] = useState('');
  const [generated, setGenerated] = useState<GeneratedOutfit[]>([]);
  const [generationRound, setGenerationRound] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [visualizingId, setVisualizingId] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    setWeatherLoading(true);
    fetchWeather().then(setWeather).finally(() => setWeatherLoading(false));
  }, []);

  const { data: lookbook } = useQuery({
    queryKey: ['outfits'],
    queryFn: () => apiGet<{ outfits: GeneratedOutfit[] }>('/outfits'),
  });

  const { data: wardrobeData } = useQuery({
    queryKey: ['wardrobe'],
    queryFn: () => apiGet<{ items: WardrobeItem[] }>('/wardrobe'),
  });

  const wardrobeItems = wardrobeData?.items ?? [];
  const savedOutfits = lookbook?.outfits ?? [];

  const stats = useMemo(() => ({
    total: savedOutfits.length,
    favorites: savedOutfits.filter(o => o.feedback === 'loved').length,
    thisWeek: savedOutfits.filter(o => {
      const d = new Date(o.created_at);
      const now = new Date();
      return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length,
  }), [savedOutfits]);

  const displayedOutfits = useMemo(() => {
    if (filterTab === 'favorites') return savedOutfits.filter(o => o.feedback === 'loved');
    return savedOutfits;
  }, [savedOutfits, filterTab]);

  const vibeValue = [...selectedVibes, customVibe].filter(Boolean).join(', ');

  async function generate() {
    setIsGenerating(true);
    setGenerateError(null);
    setGenerated([]);
    try {
      const result = await apiPost<{ outfits: GeneratedOutfit[] }>('/outfits/generate', {
        occasion, vibe: vibeValue, generation_round: generationRound,
        weather_override: weather ? { temp_c: weather.temp_c, condition: weather.condition } : undefined,
      });
      setGenerated(result.outfits);
      setGenerationRound(r => r + 1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }

  const { mutate: saveOutfit } = useMutation({
    mutationFn: (id: string) => apiPatch(`/outfits/${id}`, { saved: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  const { mutate: removeOutfit } = useMutation({
    mutationFn: (id: string) => apiPatch(`/outfits/${id}`, { saved: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  const { mutate: sendFeedback } = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: 'loved' | 'disliked' }) =>
      apiPatch(`/outfits/${id}`, { feedback }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  const { mutate: visualize } = useMutation({
    mutationFn: (id: string) => apiPost<{ image_url: string }>(`/outfits/${id}/visualize`, {}),
    onMutate: (id) => setVisualizingId(id),
    onSuccess: (data, id) => {
      setGenerated(prev => prev.map(o => o.id === id ? { ...o, image_url: data.image_url } : o));
      setVisualizingId(null);
    },
    onError: (err) => {
      setVisualizingId(null);
      Alert.alert('Visualisation failed', err instanceof Error ? err.message : 'Something went wrong');
    },
  });

  function handleSave(id: string) {
    saveOutfit(id);
    setGenerated(prev => prev.map(o => o.id === id ? { ...o, saved: true } : o));
  }

  function handleDelete(id: string) {
    Alert.alert('Remove outfit', 'Remove this outfit from your lookbook?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeOutfit(id) },
    ]);
  }

  function handleFeedback(id: string, feedback: 'loved' | 'disliked') {
    sendFeedback({ id, feedback });
    setGenerated(prev => prev.map(o => o.id === id ? { ...o, feedback } : o));
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 4 }}>
        <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>My Outfits</Text>
        <Text style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>Your looks, organised for every moment.</Text>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 10 }}>
        {[
          { label: 'Outfits', value: stats.total, icon: '🧥' },
          { label: 'Favorites', value: stats.favorites, icon: '♥' },
          { label: 'This week', value: stats.thisWeek, icon: '✨' },
        ].map(stat => (
          <View key={stat.label} style={{
            flex: 1, backgroundColor: SURFACE, borderRadius: 16,
            padding: 14, alignItems: 'center',
            borderWidth: 1, borderColor: BORDER,
          }}>
            <Text style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</Text>
            <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700' }}>{stat.value}</Text>
            <Text style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab switcher */}
      <View style={{
        flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
        backgroundColor: SURFACE, borderRadius: 14, padding: 4,
        borderWidth: 1, borderColor: BORDER,
      }}>
        {([['create', 'Create'], ['looks', 'My Looks']] as const).map(([key, label]) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center', backgroundColor: active ? PURPLE : 'transparent' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : MUTED }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* My Looks tab */}
      {activeTab === 'looks' && (
        <View style={{ flex: 1 }}>
          {/* Filter tabs */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 14, gap: 8 }}>
            {([['all', 'All Outfits'], ['favorites', 'Favorites']] as const).map(([key, label]) => {
              const active = filterTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilterTab(key)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                    borderWidth: 1, borderColor: active ? PURPLE : BORDER,
                  }}
                >
                  <Text style={{ color: active ? PURPLE_BRIGHT : MUTED, fontSize: 13, fontWeight: active ? '600' : '400' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
            {displayedOutfits.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 28 }}>🪞</Text>
                </View>
                <Text style={{ color: TEXT, fontWeight: '600', fontSize: 16, marginBottom: 8 }}>
                  {filterTab === 'favorites' ? 'No favourites yet' : 'No saved outfits yet'}
                </Text>
                <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                  {filterTab === 'favorites'
                    ? 'Give a 👍 to any outfit to add it here.'
                    : 'Generate outfits and save the ones you love.'}
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('create')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Create an outfit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayedOutfits.map(outfit => (
                <OutfitCard
                  key={outfit.id}
                  outfit={{ ...outfit, saved: true }}
                  wardrobeItems={wardrobeItems}
                  onDelete={handleDelete}
                  onFeedback={handleFeedback}
                  onFullscreen={setFullscreenImage}
                />
              ))
            )}

            {/* Create more CTA — inside scroll so it never covers content */}
            <View style={{
              backgroundColor: SURFACE, borderRadius: 20, padding: 16, marginTop: 16, marginBottom: 120,
              flexDirection: 'row', alignItems: 'center',
              borderWidth: 1, borderColor: BORDER_PURPLE,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 18 }}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }}>Let AI create more looks for you</Text>
                <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>Get personalised ideas from your wardrobe.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveTab('create')}
                activeOpacity={0.85}
                style={{ backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>✨ Create</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Create tab */}
      {activeTab === 'create' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          <View style={{ marginHorizontal: 20, backgroundColor: SURFACE, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ color: TEXT, fontWeight: '600', fontSize: 15, marginBottom: 16 }}>What are you dressing for?</Text>

            {/* Weather */}
            <View style={{ marginBottom: 16 }}>
              {weatherLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={MUTED} />
                  <Text style={{ color: MUTED, fontSize: 12 }}>Getting weather...</Text>
                </View>
              ) : weather ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SURFACE_SOFT, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: BORDER }}>
                  <Text style={{ fontSize: 15 }}>{weather.emoji}</Text>
                  <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>{weather.temp_c}°C</Text>
                  <Text style={{ color: MUTED, fontSize: 12 }}>{weather.condition}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setWeatherLoading(true); fetchWeather().then(setWeather).finally(() => setWeatherLoading(false)); }} activeOpacity={0.7} style={{ alignSelf: 'flex-start' }}>
                  <Text style={{ color: MUTED, fontSize: 12 }}>📍 Tap to add weather context</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Occasion *</Text>
            <TextInput
              value={occasion}
              onChangeText={setOccasion}
              placeholder="e.g. dinner, work meeting, beach day..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top', backgroundColor: SURFACE_SOFT, color: TEXT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}
            />

            <Text style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Vibe *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {VIBE_SUGGESTIONS.map(v => {
                const active = selectedVibes.includes(v);
                return (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setSelectedVibes(prev => active ? prev.filter(x => x !== v) : [...prev, v])}
                    activeOpacity={0.8}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: active ? PURPLE : BORDER, backgroundColor: active ? 'rgba(139,92,246,0.15)' : SURFACE_SOFT }}
                  >
                    <Text style={{ fontSize: 12, color: active ? PURPLE_BRIGHT : MUTED, fontWeight: active ? '600' : '400' }}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={customVibe}
              onChangeText={setCustomVibe}
              placeholder="Or describe your own vibe..."
              placeholderTextColor="#6b7280"
              style={{ backgroundColor: SURFACE_SOFT, color: TEXT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}
            />

            {generateError && <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{generateError}</Text>}

            <TouchableOpacity
              onPress={generate}
              disabled={isGenerating || !occasion || !vibeValue}
              activeOpacity={0.85}
              style={{ backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: isGenerating || !occasion || !vibeValue ? 0.45 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {isGenerating ? 'Building your outfits...' : 'Generate Outfits'}
              </Text>
            </TouchableOpacity>
          </View>

          {generated.length > 0 && (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ color: MUTED, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Generated</Text>
              {generated.map(outfit => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  wardrobeItems={wardrobeItems}
                  onSave={handleSave}
                  onFeedback={handleFeedback}
                  onVisualize={id => visualize(id)}
                  onFullscreen={setFullscreenImage}
                  isVisualizing={visualizingId === outfit.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Fullscreen image modal */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade" onRequestClose={() => setFullscreenImage(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity
            onPress={() => setFullscreenImage(null)}
            style={{ position: 'absolute', top: 56, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 10 }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
          {fullscreenImage && <Image source={{ uri: fullscreenImage }} style={{ flex: 1 }} resizeMode="contain" />}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
