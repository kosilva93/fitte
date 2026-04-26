import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/utils/api';
import type { ItemType, WardrobeItem } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_TYPES: { value: ItemType; emoji: string; label: string }[] = [
  { value: 'top', emoji: '👕', label: 'Top' },
  { value: 'bottom', emoji: '👖', label: 'Bottom' },
  { value: 'dress', emoji: '👗', label: 'Dress' },
  { value: 'shoes', emoji: '👟', label: 'Shoes' },
  { value: 'outerwear', emoji: '🧥', label: 'Outerwear' },
  { value: 'accessory', emoji: '🧣', label: 'Accessory' },
  { value: 'suit', emoji: '🤵', label: 'Suit' },
];

const COLOR_OPTIONS = [
  'black', 'white', 'grey', 'navy', 'blue', 'brown',
  'beige', 'camel', 'green', 'olive', 'red', 'burgundy',
  'pink', 'orange', 'yellow', 'purple', 'cream',
];

const COLOR_HEX: Record<string, string> = {
  black: '#000', white: '#fff', grey: '#9CA3AF', navy: '#1E3A5F',
  blue: '#3B82F6', brown: '#92400E', beige: '#D4B896', camel: '#C19A6B',
  green: '#16A34A', olive: '#6B7C3A', red: '#DC2626', burgundy: '#7F1D1D',
  pink: '#EC4899', orange: '#F97316', yellow: '#EAB308', purple: '#9333EA',
  cream: '#FFFDD0',
};

// ─── Upload helper ───────────────────────────────────────────────────────────

async function uploadPhoto(uri: string): Promise<string> {
  const { uploadUrl, path } = await apiPost<{ uploadUrl: string; path: string }>(
    '/wardrobe/upload-url',
    {}
  );

  const blob = await (await fetch(uri)).blob();
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type || 'image/jpeg' },
  });

  if (!uploadRes.ok) throw new Error('Photo upload failed');
  return path;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AddItemScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState('');

  function toggleColor(c: string) {
    setColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to add wardrobe items.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  const { mutate: addItem, isPending } = useMutation({
    mutationFn: async () => {
      let photoPath: string | undefined;
      if (photoUri) photoPath = await uploadPhoto(photoUri);

      return apiPost<{ item: WardrobeItem }>('/wardrobe/items', {
        item_type: itemType,
        label: label.trim() || undefined,
        brand: brand.trim() || undefined,
        colors,
        photo_path: photoPath,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      router.back();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      if (message.includes('Free tier limit')) {
        Alert.alert(
          'Wardrobe limit reached',
          'Free accounts can store up to 10 items. Upgrade to Pro for unlimited items.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const isValid = itemType && colors.length > 0;

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>

      {/* Photo picker */}
      <Text className="text-gray-500 text-xs uppercase tracking-widest mb-3">Photo (optional)</Text>
      {photoUri ? (
        <View className="mb-6">
          <Image source={{ uri: photoUri }} className="w-full aspect-square rounded-2xl" resizeMode="cover" />
          <TouchableOpacity
            onPress={() => setPhotoUri(null)}
            className="mt-2 self-start border border-gray-700 px-3 py-1.5 rounded-full"
          >
            <Text className="text-gray-400 text-xs">Remove photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={takePhoto}
            className="flex-1 bg-gray-900 rounded-2xl py-5 items-center border border-gray-800"
          >
            <Text className="text-2xl mb-1">📷</Text>
            <Text className="text-white text-sm font-medium">Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickFromLibrary}
            className="flex-1 bg-gray-900 rounded-2xl py-5 items-center border border-gray-800"
          >
            <Text className="text-2xl mb-1">🖼️</Text>
            <Text className="text-white text-sm font-medium">From Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Item type */}
      <Text className="text-gray-500 text-xs uppercase tracking-widest mb-3">
        Type <Text className="text-red-400">*</Text>
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {ITEM_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => setItemType(t.value)}
            className={`items-center px-4 py-3 rounded-xl border ${
              itemType === t.value ? 'bg-white border-white' : 'bg-transparent border-gray-800'
            }`}
          >
            <Text className="text-xl">{t.emoji}</Text>
            <Text className={`text-xs mt-1 ${itemType === t.value ? 'text-black' : 'text-gray-400'}`}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Colors */}
      <Text className="text-gray-500 text-xs uppercase tracking-widest mb-3">
        Color(s) <Text className="text-red-400">*</Text>
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {COLOR_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => toggleColor(c)}
            className={`flex-row items-center gap-2 px-3 py-2 rounded-full border ${
              colors.includes(c) ? 'bg-white border-white' : 'border-gray-800'
            }`}
          >
            <View
              className="w-3 h-3 rounded-full border border-gray-600"
              style={{ backgroundColor: COLOR_HEX[c] ?? c }}
            />
            <Text className={`text-xs capitalize ${colors.includes(c) ? 'text-black' : 'text-gray-400'}`}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Label & Brand */}
      <Text className="text-gray-500 text-xs uppercase tracking-widest mb-3">Details</Text>
      <TextInput
        placeholder="Name / Label (e.g. White Oxford Shirt)"
        placeholderTextColor="#6b7280"
        value={label}
        onChangeText={setLabel}
        className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm mb-3"
      />
      <TextInput
        placeholder="Brand (e.g. Zara, Nike)"
        placeholderTextColor="#6b7280"
        value={brand}
        onChangeText={setBrand}
        className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm mb-8"
      />

      {/* Submit */}
      <TouchableOpacity
        onPress={() => addItem()}
        disabled={!isValid || isPending}
        className={`py-4 rounded-2xl items-center ${isValid && !isPending ? 'bg-white' : 'bg-gray-800'}`}
      >
        {isPending ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className={`font-semibold text-base ${isValid ? 'text-black' : 'text-gray-600'}`}>
            Add to Wardrobe
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
