import {
  View, Text, FlatList, TouchableOpacity, Image, Alert,
  StatusBar, TextInput, ScrollView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { apiGet, apiDelete, apiPost } from '@/utils/api';
import type { WardrobeItem, ItemType } from '@/types';

const TILE_WIDTH = (Dimensions.get('window').width - 32 - 3 * 8) / 4;

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const BORDER_PURPLE = 'rgba(139,92,246,0.35)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE_BRIGHT = '#A78BFA';
const PURPLE = '#8B5CF6';

const CATEGORIES: { key: string; label: string; types: ItemType[] }[] = [
  { key: 'all', label: 'All Items', types: [] },
  { key: 'tops', label: 'Tops', types: ['top'] },
  { key: 'bottoms', label: 'Bottoms', types: ['bottom'] },
  { key: 'shoes', label: 'Shoes', types: ['shoes'] },
  { key: 'outerwear', label: 'Outerwear', types: ['outerwear'] },
  { key: 'dresses', label: 'Dresses', types: ['dress'] },
  { key: 'accessories', label: 'Accessories', types: ['accessory', 'suit'] },
];

const CAT_ICONS: Record<string, string> = {
  top: '👕', bottom: '👖', shoes: '👟',
  outerwear: '🧥', dress: '👗', accessory: '🧣', suit: '🤵',
};

const COLOR_HEX: Record<string, string> = {
  black: '#000', white: '#fff', grey: '#9CA3AF', navy: '#1E3A5F',
  blue: '#3B82F6', brown: '#92400E', beige: '#D4B896', camel: '#C19A6B',
  green: '#16A34A', olive: '#6B7C3A', red: '#DC2626', burgundy: '#7F1D1D',
  pink: '#EC4899', orange: '#F97316', yellow: '#EAB308', purple: '#9333EA',
  cream: '#FFFDD0',
};

export default function WardrobeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wardrobe'],
    queryFn: () => apiGet<{ items: WardrobeItem[] }>('/wardrobe'),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some(i => i.classification_status === 'pending' || i.classification_status === 'processing') ? 5000 : false;
    },
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: (id: string) => apiDelete(`/wardrobe/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe'] }),
  });

  const { mutate: retryItem } = useMutation({
    mutationFn: (id: string) => apiPost(`/wardrobe/items/${id}/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe'] }),
  });

  const allItems = data?.items ?? [];

  const stats = useMemo(() => ({
    tops: allItems.filter(i => i.item_type === 'top').length,
    bottoms: allItems.filter(i => i.item_type === 'bottom').length,
    shoes: allItems.filter(i => i.item_type === 'shoes').length,
    accessories: allItems.filter(i => ['accessory', 'suit'].includes(i.item_type)).length,
  }), [allItems]);

  const filteredItems = useMemo(() => {
    const cat = CATEGORIES.find(c => c.key === selectedCategory);
    let result = cat?.types.length ? allItems.filter(i => cat.types.includes(i.item_type)) : allItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.label?.toLowerCase().includes(q) ||
        i.item_type.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allItems, selectedCategory, searchQuery]);

  function handleLongPress(item: WardrobeItem) {
    Alert.alert(
      'Remove item',
      `Remove "${item.label ?? item.item_type}" from your wardrobe?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteItem(item.id) },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        numColumns={4}
        onRefresh={refetch}
        refreshing={isLoading}
        contentContainerStyle={{ paddingBottom: 150 }}
        columnWrapperStyle={{ gap: 8, paddingHorizontal: 16, marginBottom: 8 }}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
              paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 20,
            }}>
              <View>
                <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700', letterSpacing: -0.4 }}>My Wardrobe</Text>
                <Text style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>{allItems.length} items</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/wardrobe/add')}
                activeOpacity={0.8}
                style={{ backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 18, lineHeight: 20, fontWeight: '300' }}>+</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add item</Text>
              </TouchableOpacity>
            </View>

            {/* Overview card */}
            {allItems.length > 0 && (
              <View style={{
                marginHorizontal: 16, marginBottom: 20,
                backgroundColor: SURFACE, borderRadius: 20, padding: 20,
                borderWidth: 1, borderColor: BORDER_PURPLE,
                flexDirection: 'row', alignItems: 'center',
              }}>
                {/* Circle */}
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  borderWidth: 3, borderColor: PURPLE,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 20,
                  shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
                }}>
                  <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', lineHeight: 26 }}>{allItems.length}</Text>
                  <Text style={{ color: MUTED, fontSize: 10 }}>Items</Text>
                </View>

                {/* Category breakdown */}
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    { label: 'Tops', count: stats.tops, icon: '👕' },
                    { label: 'Bottoms', count: stats.bottoms, icon: '👖' },
                    { label: 'Shoes', count: stats.shoes, icon: '👟' },
                    { label: 'Access.', count: stats.accessories, icon: '🧣' },
                  ].map(cat => (
                    <View key={cat.label} style={{ width: '44%', alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                      <View>
                        <Text style={{ color: TEXT, fontSize: 14, fontWeight: '600' }}>{cat.count}</Text>
                        <Text style={{ color: MUTED, fontSize: 10 }}>{cat.label}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Category filter tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 14 }}
            >
              {CATEGORIES.map(cat => {
                const active = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: active ? PURPLE : SURFACE,
                      borderWidth: 1, borderColor: active ? PURPLE : BORDER,
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : MUTED, fontSize: 13, fontWeight: active ? '600' : '400' }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search bar */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              marginHorizontal: 16, marginBottom: 16,
              backgroundColor: SURFACE, borderRadius: 14,
              borderWidth: 1, borderColor: BORDER,
              paddingHorizontal: 14, paddingVertical: 11, gap: 10,
            }}>
              <Text style={{ fontSize: 14, color: MUTED }}>🔍</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
                placeholderTextColor="#6b7280"
                style={{ flex: 1, color: TEXT, fontSize: 14 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={{ color: MUTED, fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Empty state */}
            {!isLoading && filteredItems.length === 0 && allItems.length > 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: MUTED, fontSize: 14 }}>No items match your search.</Text>
              </View>
            )}
            {!isLoading && allItems.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 28 }}>👔</Text>
                </View>
                <Text style={{ color: TEXT, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Start building your closet</Text>
                <Text style={{ color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
                  Add your first item to get personalised outfit suggestions.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/wardrobe/add')}
                  activeOpacity={0.8}
                  style={{ backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add first item</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          allItems.length > 0 ? (
            <View style={{
              marginHorizontal: 16, marginTop: 20,
              backgroundColor: SURFACE, borderRadius: 20,
              borderWidth: 1, borderColor: BORDER_PURPLE,
              padding: 18, flexDirection: 'row', alignItems: 'center',
            }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ fontSize: 20 }}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '600', marginBottom: 2 }}>Keep your wardrobe smart.</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>Add items, keep them organised.</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/wardrobe/add')}
                activeOpacity={0.8}
                style={{ backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              width: TILE_WIDTH, backgroundColor: SURFACE,
              borderRadius: 14, overflow: 'hidden',
              borderWidth: 1, borderColor: BORDER,
            }}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={400}
            activeOpacity={0.9}
          >
            {/* Image — portrait ratio to match design */}
            <View style={{ width: '100%', aspectRatio: 3 / 4, backgroundColor: SURFACE_SOFT }}>
              {item.photo_thumbnail_url ? (
                <Image source={{ uri: item.photo_thumbnail_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{CAT_ICONS[item.item_type] ?? '👔'}</Text>
                </View>
              )}

              {(item.classification_status === 'pending' || item.classification_status === 'processing') && (
                <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <Text style={{ color: PURPLE_BRIGHT, fontSize: 8, fontWeight: '600' }}>Generating...</Text>
                </View>
              )}
              {item.classification_status === 'failed' && (
                <TouchableOpacity
                  onPress={() => retryItem(item.id)}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 4, alignItems: 'center', backgroundColor: 'rgba(127,29,29,0.85)' }}
                >
                  <Text style={{ color: '#fca5a5', fontSize: 8 }}>Tap to retry</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Label */}
            <View style={{ padding: 6 }}>
              <Text style={{ color: TEXT, fontSize: 10, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                {item.label ?? item.item_type}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                {item.colors[0] && (
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: COLOR_HEX[item.colors[0]] ?? item.colors[0],
                    borderWidth: item.colors[0] === 'white' ? 1 : 0,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }} />
                )}
                <Text style={{ color: MUTED, fontSize: 9, textTransform: 'capitalize' }} numberOfLines={1}>
                  {item.item_type}{item.occasion_tags?.[0] ? ` • ${item.occasion_tags[0]}` : ''}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
