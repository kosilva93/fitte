import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/utils/api';
import { GeneratedOutfit } from '@/types';

const VIBE_SUGGESTIONS = [
  'Casual', 'Sharp', 'Relaxed', 'Bold', 'Understated',
  'Romantic', 'Edgy', 'Polished', 'Playful', 'Minimal',
];

function OutfitCard({
  outfit,
  onSave,
  onFeedback,
}: {
  outfit: GeneratedOutfit;
  onSave?: (id: string) => void;
  onFeedback?: (id: string, feedback: 'loved' | 'disliked') => void;
}) {
  return (
    <View className="bg-gray-900 rounded-xl p-4">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-white font-medium capitalize flex-1 mr-2">{outfit.occasion}</Text>
        {outfit.color_logic && (
          <Text className="text-gray-600 text-xs capitalize">{outfit.color_logic}</Text>
        )}
      </View>
      {outfit.vibe && (
        <Text className="text-gray-500 text-xs mb-2">· {outfit.vibe}</Text>
      )}
      <Text className="text-gray-300 text-sm leading-relaxed">{outfit.description}</Text>

      <View className="flex-row items-center mt-3 gap-2">
        {onSave && !outfit.saved && (
          <TouchableOpacity
            onPress={() => onSave(outfit.id)}
            className="border border-gray-700 rounded-full px-3 py-1.5"
          >
            <Text className="text-gray-500 text-xs">Save to lookbook</Text>
          </TouchableOpacity>
        )}
        {outfit.saved && (
          <Text className="text-gray-600 text-xs">Saved ✓</Text>
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
  );
}

export default function OutfitsScreen() {
  const queryClient = useQueryClient();
  const [occasion, setOccasion] = useState('');
  const [vibe, setVibe] = useState('');
  const [generated, setGenerated] = useState<GeneratedOutfit[]>([]);

  const { data: lookbook } = useQuery({
    queryKey: ['outfits'],
    queryFn: () => apiGet<{ outfits: GeneratedOutfit[] }>('/outfits'),
  });

  const { mutate: generate, isPending, error } = useMutation({
    mutationFn: () =>
      apiPost<{ outfits: GeneratedOutfit[] }>('/outfits/generate', {
        occasion,
        vibe,
        generation_round: 1,
      }),
    onSuccess: (data) => setGenerated(data.outfits),
  });

  const { mutate: saveOutfit } = useMutation({
    mutationFn: (id: string) => apiPatch(`/outfits/${id}`, { saved: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  const { mutate: sendFeedback } = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: 'loved' | 'disliked' }) =>
      apiPatch(`/outfits/${id}`, { feedback }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outfits'] }),
  });

  function handleSave(id: string) {
    saveOutfit(id);
    setGenerated((prev) => prev.map((o) => (o.id === id ? { ...o, saved: true } : o)));
  }

  function handleFeedback(id: string, feedback: 'loved' | 'disliked') {
    sendFeedback({ id, feedback });
    setGenerated((prev) => prev.map((o) => (o.id === id ? { ...o, feedback } : o)));
  }

  const savedOutfits = lookbook?.outfits ?? [];

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 pt-16 pb-4">
        <Text className="text-white text-2xl font-bold">Outfits</Text>
      </View>

      {/* Generator card */}
      <View className="mx-6 bg-gray-900 rounded-2xl p-5 mb-6">
        <Text className="text-white font-semibold text-base mb-4">What are you dressing for?</Text>

        <Text className="text-gray-500 text-xs uppercase mb-1">Occasion *</Text>
        <TextInput
          value={occasion}
          onChangeText={setOccasion}
          placeholder="e.g. dinner, work meeting, beach day..."
          placeholderTextColor="#6b7280"
          className="bg-black text-white rounded-xl px-4 py-3 text-sm mb-4"
        />

        <Text className="text-gray-500 text-xs uppercase mb-1">Vibe *</Text>
        <TextInput
          value={vibe}
          onChangeText={setVibe}
          placeholder="How do you want to feel?"
          placeholderTextColor="#6b7280"
          className="bg-black text-white rounded-xl px-4 py-3 text-sm mb-2"
        />

        <View className="flex-row flex-wrap gap-2 mb-4">
          {VIBE_SUGGESTIONS.map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setVibe(v)}
              className={`px-3 py-1.5 rounded-full border ${
                vibe === v ? 'bg-white border-white' : 'border-gray-800'
              }`}
            >
              <Text className={`text-xs ${vibe === v ? 'text-black font-medium' : 'text-gray-500'}`}>
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <Text className="text-red-400 text-sm mb-3">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => generate()}
          disabled={isPending || !occasion || !vibe}
          className={`bg-white rounded-xl py-3 items-center ${
            isPending || !occasion || !vibe ? 'opacity-40' : ''
          }`}
        >
          <Text className="text-black font-semibold text-sm">
            {isPending ? 'Building your outfits...' : 'Generate Outfits'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Generated results */}
      {generated.length > 0 && (
        <View className="px-6 mb-6">
          <Text className="text-gray-500 text-xs uppercase tracking-wide mb-3">Generated</Text>
          <View className="space-y-3">
            {generated.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onSave={handleSave}
                onFeedback={handleFeedback}
              />
            ))}
          </View>
        </View>
      )}

      {/* Lookbook */}
      <View className="px-6">
        <Text className="text-gray-500 text-xs uppercase tracking-wide mb-3">Saved Lookbook</Text>
        {savedOutfits.length === 0 ? (
          <Text className="text-gray-600 text-sm">No saved outfits yet.</Text>
        ) : (
          <View className="space-y-3">
            {savedOutfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={{ ...outfit, saved: true }}
                onFeedback={handleFeedback}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
