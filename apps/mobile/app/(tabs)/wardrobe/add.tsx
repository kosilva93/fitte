import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  TextInput, Alert, ActivityIndicator, Linking, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/utils/api';
import type { ItemType, WardrobeItem } from '@/types';

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE = '#8B5CF6';

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

async function compressPhoto(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1024 });
  const ref = await ctx.renderAsync();
  const result = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return result.uri;
}

async function uploadPhoto(uri: string): Promise<string> {
  const compressed = await compressPhoto(uri);
  const { uploadUrl, path } = await apiPost<{ uploadUrl: string; path: string }>('/wardrobe/upload-url', {});
  const blob = await (await fetch(compressed)).blob();
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  if (!uploadRes.ok) throw new Error('Photo upload failed');
  return path;
}

export default function AddItemScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState('');

  function toggleColor(c: string) {
    setColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to add wardrobe items.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
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
      Alert.alert('Permission required', 'Allow camera access to take photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
      // No photo — generate an AI product image in the background
      if (!photoUri) {
        apiPost(`/wardrobe/items/${data.item.id}/visualize`, {}).catch(() => {});
      }
      router.back();
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      if (message.includes('Free tier limit')) {
        Alert.alert('Wardrobe limit reached', 'Free accounts can store up to 10 items. Upgrade to Pro for unlimited items.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const isValid = itemType && colors.length > 0;

  const LABEL_STYLE = { color: MUTED, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1.2, marginBottom: 12 };
  const INPUT_STYLE = { backgroundColor: SURFACE_SOFT, color: TEXT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: BORDER };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 20, paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="light-content" />

      {/* Photo picker */}
      <Text style={LABEL_STYLE}>Photo (optional)</Text>
      {photoUri ? (
        <View style={{ marginBottom: 24 }}>
          <Image source={{ uri: photoUri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 20 }} resizeMode="cover" />
          <TouchableOpacity
            onPress={() => setPhotoUri(null)}
            activeOpacity={0.7}
            style={{ marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
          >
            <Text style={{ color: MUTED, fontSize: 12 }}>Remove photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={takePhoto}
            activeOpacity={0.8}
            style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 20, paddingVertical: 20, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>📷</Text>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickFromLibrary}
            activeOpacity={0.8}
            style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 20, paddingVertical: 20, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>🖼️</Text>
            <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500' }}>From Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Item type */}
      <Text style={LABEL_STYLE}>
        Type <Text style={{ color: '#f87171' }}>*</Text>
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {ITEM_TYPES.map((t) => {
          const active = itemType === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              onPress={() => setItemType(t.value)}
              activeOpacity={0.8}
              style={{
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: active ? PURPLE : BORDER,
                backgroundColor: active ? 'rgba(139,92,246,0.15)' : SURFACE,
              }}
            >
              <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
              <Text style={{ fontSize: 11, marginTop: 4, color: active ? '#A78BFA' : MUTED, fontWeight: active ? '600' : '400' }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Colors */}
      <Text style={LABEL_STYLE}>
        Color(s) <Text style={{ color: '#f87171' }}>*</Text>
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {COLOR_OPTIONS.map((c) => {
          const active = colors.includes(c);
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toggleColor(c)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: active ? PURPLE : BORDER,
                backgroundColor: active ? 'rgba(139,92,246,0.15)' : SURFACE,
              }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLOR_HEX[c] ?? c, borderWidth: c === 'white' ? 1 : 0, borderColor: 'rgba(255,255,255,0.2)' }} />
              <Text style={{ fontSize: 11, textTransform: 'capitalize', color: active ? '#A78BFA' : MUTED, fontWeight: active ? '600' : '400' }}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Details */}
      <Text style={[LABEL_STYLE, { marginBottom: 12 }]}>Details</Text>
      <TextInput
        placeholder="Name / Label (e.g. White Oxford Shirt)"
        placeholderTextColor="#6b7280"
        value={label}
        onChangeText={setLabel}
        style={[INPUT_STYLE, { marginBottom: 10 }]}
      />
      <TextInput
        placeholder="Brand (e.g. Zara, Nike)"
        placeholderTextColor="#6b7280"
        value={brand}
        onChangeText={setBrand}
        style={[INPUT_STYLE, { marginBottom: 32 }]}
      />

      {/* Submit */}
      <TouchableOpacity
        onPress={() => addItem()}
        disabled={!isValid || isPending}
        activeOpacity={0.85}
        style={{
          paddingVertical: 16,
          borderRadius: 16,
          alignItems: 'center',
          backgroundColor: isValid && !isPending ? PURPLE : SURFACE,
          borderWidth: isValid ? 0 : 1,
          borderColor: BORDER,
        }}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontWeight: '600', fontSize: 15, color: isValid ? '#fff' : MUTED }}>
            Add to Wardrobe
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
