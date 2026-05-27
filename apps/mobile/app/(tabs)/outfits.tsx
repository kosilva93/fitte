import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { apiGet, apiPost, apiPatch, apiStream } from '@/utils/api';
import { GeneratedOutfit, RecommendedItem } from '@/types';

const VIBE_SUGGESTIONS = [
  'Casual', 'Sharp', 'Relaxed', 'Bold', 'Understated',
  'Romantic', 'Edgy', 'Polished', 'Playful', 'Minimal',
];

const WMO_CONDITION: Record<number, string> = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle',
  55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers',
  81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorm', 99: 'Thunderstorm',
};

function weatherEmoji(code: number): string {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2 || code === 3) return '⛅';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

interface Weather { temp_c: number; condition: string; emoji: string }

async function fetchWeather(): Promise<Weather | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = loc.coords;
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
  );
  const json = await res.json();
  const code: number = json.current?.weather_code ?? 0;
  const temp_c = Math.round(json.current?.temperature_2m ?? 0);
  const condition = WMO_CONDITION[code] ?? 'Clear';
  return { temp_c, condition, emoji: weatherEmoji(code) };
}

function OutfitCard({
  outfit,
  onSave,
  onDelete,
  onFeedback,
  onVisualize,
  isVisualizing,
}: {
  outfit: GeneratedOutfit;
  onSave?: (id: string) => void;
  onDelete?: (id: string) => void;
  onFeedback?: (id: string, feedback: 'loved' | 'disliked') => void;
  onVisualize?: (id: string) => void;
  isVisualizing?: boolean;
}) {
  return (
    <View className="bg-gray-900 rounded-xl overflow-hidden mb-3">
      {outfit.image_url ? (
        <Image
          source={{ uri: outfit.image_url }}
          style={{ width: '100%', height: 300 }}
          resizeMode="cover"
        />
      ) : onVisualize ? (
        <TouchableOpacity
          onPress={() => onVisualize(outfit.id)}
          disabled={isVisualizing}
          className="bg-gray-800 items-center justify-center py-10"
        >
          {isVisualizing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text className="text-white text-2xl mb-1">✦</Text>
              <Text className="text-gray-400 text-xs">Tap to visualize outfit</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-white font-medium capitalize flex-1 mr-2">{outfit.occasion}</Text>
          {outfit.color_logic && (
            <Text className="text-gray-600 text-xs capitalize">{outfit.color_logic}</Text>
          )}
        </View>
        {outfit.vibe && (
          <Text className="text-gray-500 text-xs mb-2">· {outfit.vibe}</Text>
        )}
        <Text className="text-gray-300 text-sm leading-relaxed mb-3">{outfit.description}</Text>

        {outfit.recommended_items?.length > 0 && (
          <View className="bg-black rounded-xl p-3 mb-3">
            <Text className="text-gray-500 text-xs uppercase mb-2">Consider buying</Text>
            {outfit.recommended_items.map((item: RecommendedItem, i: number) => (
              <View key={i} className="mb-2">
                <Text className="text-white text-xs font-medium capitalize">{item.type} — {item.description}</Text>
                <Text className="text-gray-500 text-xs">{item.price_range} · {item.brands.join(', ')}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row items-center gap-2">
          {onSave && !outfit.saved && (
            <TouchableOpacity
              onPress={() => onSave(outfit.id)}
              className="border border-gray-700 rounded-full px-3 py-1.5"
            >
              <Text className="text-gray-500 text-xs">Save to lookbook</Text>
            </TouchableOpacity>
          )}
          {outfit.saved && !onDelete && (
            <Text className="text-gray-600 text-xs">Saved ✓</Text>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(outfit.id)}
              className="border border-gray-800 rounded-full px-3 py-1.5"
            >
              <Text className="text-gray-600 text-xs">Remove</Text>
            </TouchableOpacity>
          )}

          {onFeedback && (
            <View className="flex-row gap-2 ml-auto">
              <TouchableOpacity
                onPress={() => onFeedback(outfit.id, 'loved')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: outfit.feedback === 'loved' ? 'rgba(20,83,45,0.5)' : 'transparent',
                }}
              >
                <Text className="text-sm">👍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onFeedback(outfit.id, 'disliked')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: outfit.feedback === 'disliked' ? 'rgba(127,29,29,0.5)' : 'transparent',
                }}
              >
                <Text className="text-sm">👎</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function OutfitsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [occasion, setOccasion] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [customVibe, setCustomVibe] = useState('');
  const [generated, setGenerated] = useState<GeneratedOutfit[]>([]);
  const [generationRound, setGenerationRound] = useState(1);
  const [visualizingId, setVisualizingId] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    setWeatherLoading(true);
    fetchWeather()
      .then(setWeather)
      .finally(() => setWeatherLoading(false));
  }, []);

  const { data: lookbook } = useQuery({
    queryKey: ['outfits'],
    queryFn: () => apiGet<{ outfits: GeneratedOutfit[] }>('/outfits'),
  });

  const vibeValue = [...selectedVibes, customVibe].filter(Boolean).join(', ');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setGenerateError(null);
    setGenerated([]);
    try {
      await apiStream<GeneratedOutfit>('/outfits/generate', {
        occasion,
        vibe: vibeValue,
        generation_round: generationRound,
        weather_override: weather ? { temp_c: weather.temp_c, condition: weather.condition } : undefined,
      }, (outfit) => {
        setGenerated((prev) => [...prev, outfit]);
      });
      setGenerationRound((r) => r + 1);
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
    mutationFn: (id: string) =>
      apiPost<{ image_url: string }>(`/outfits/${id}/visualize`, {}),
    onMutate: (id) => setVisualizingId(id),
    onSuccess: (data, id) => {
      setGenerated((prev) =>
        prev.map((o) => (o.id === id ? { ...o, image_url: data.image_url } : o))
      );
      setVisualizingId(null);
    },
    onError: () => setVisualizingId(null),
  });

  function handleSave(id: string) {
    saveOutfit(id);
    setGenerated((prev) => prev.map((o) => (o.id === id ? { ...o, saved: true } : o)));
  }

  function handleDelete(id: string) {
    Alert.alert(
      'Remove outfit',
      'Remove this outfit from your lookbook?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeOutfit(id) },
      ]
    );
  }

  function handleFeedback(id: string, feedback: 'loved' | 'disliked') {
    sendFeedback({ id, feedback });
    setGenerated((prev) => prev.map((o) => (o.id === id ? { ...o, feedback } : o)));
  }

  const savedOutfits = lookbook?.outfits ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16 }}>
        <Text className="text-white text-2xl font-bold">Outfits</Text>
      </View>

      {/* Tab switcher */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 24,
        marginBottom: 20,
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 4,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('generate')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeTab === 'generate' ? '#fff' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === 'generate' ? '#000' : '#6b7280' }}>
            Generate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('saved')}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeTab === 'saved' ? '#fff' : 'transparent',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === 'saved' ? '#000' : '#6b7280' }}>
            Lookbook {savedOutfits.length > 0 ? `(${savedOutfits.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Generate tab */}
      {activeTab === 'generate' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={{ marginHorizontal: 24, backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <Text className="text-white font-semibold text-base mb-4">What are you dressing for?</Text>

            {/* Weather badge */}
            <View style={{ marginBottom: 16 }}>
              {weatherLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#6b7280" />
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>Getting weather...</Text>
                </View>
              ) : weather ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 16 }}>{weather.emoji}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{weather.temp_c}°C</Text>
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>{weather.condition}</Text>
                  <Text style={{ color: '#374151', fontSize: 11 }}>· used for suggestions</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setWeatherLoading(true);
                    fetchWeather().then(setWeather).finally(() => setWeatherLoading(false));
                  }}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>📍 Tap to add weather context</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text className="text-gray-500 text-xs uppercase mb-1">Occasion *</Text>
            <TextInput
              value={occasion}
              onChangeText={setOccasion}
              placeholder="e.g. dinner, work meeting, beach day..."
              placeholderTextColor="#6b7280"
              className="bg-black text-white rounded-xl px-4 py-3 text-sm mb-4"
            />

            <Text className="text-gray-500 text-xs uppercase mb-2">Vibe *</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {VIBE_SUGGESTIONS.map((v) => {
                const active = selectedVibes.includes(v);
                return (
                  <TouchableOpacity
                    key={v}
                    onPress={() =>
                      setSelectedVibes((prev) =>
                        active ? prev.filter((x) => x !== v) : [...prev, v]
                      )
                    }
                    className={`px-3 py-1.5 rounded-full border ${active ? 'bg-white border-white' : 'border-gray-800'}`}
                  >
                    <Text className={`text-xs ${active ? 'text-black font-medium' : 'text-gray-500'}`}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={customVibe}
              onChangeText={setCustomVibe}
              placeholder="Or describe your own vibe..."
              placeholderTextColor="#6b7280"
              className="bg-black text-white rounded-xl px-4 py-3 text-sm mb-4"
            />

            {generateError && (
              <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{generateError}</Text>
            )}

            <TouchableOpacity
              onPress={generate}
              disabled={isGenerating || !occasion || !vibeValue}
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: isGenerating || !occasion || !vibeValue ? 0.4 : 1,
              }}
            >
              <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>
                {isGenerating ? 'Building your outfits...' : 'Generate Outfits'}
              </Text>
            </TouchableOpacity>
          </View>

          {generated.length > 0 && (
            <View style={{ paddingHorizontal: 24 }}>
              <Text className="text-gray-500 text-xs uppercase tracking-wide mb-3">Generated</Text>
              {generated.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  onSave={handleSave}
                  onFeedback={handleFeedback}
                  onVisualize={(id) => visualize(id)}
                  isVisualizing={visualizingId === outfit.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Saved tab */}
      {activeTab === 'saved' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          {savedOutfits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🪞</Text>
              <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>No saved outfits yet</Text>
              <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
                Generate outfits and save the ones you love to build your lookbook.
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTab('generate')}
                style={{ marginTop: 20, borderWidth: 1, borderColor: '#374151', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>Start generating</Text>
              </TouchableOpacity>
            </View>
          ) : (
            savedOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={{ ...outfit, saved: true }}
                onDelete={handleDelete}
                onFeedback={handleFeedback}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
