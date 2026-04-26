import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '@/utils/api';
import type { WardrobeItem } from '@/types';

export default function WardrobeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['wardrobe'],
    queryFn: () => apiGet<{ items: WardrobeItem[] }>('/wardrobe'),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasProcessing = items.some(
        (i) => i.classification_status === 'pending' || i.classification_status === 'processing'
      );
      return hasProcessing ? 5000 : false;
    },
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: (id: string) => apiDelete(`/wardrobe/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wardrobe'] }),
  });

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

  const items = data?.items ?? [];

  return (
    <View className="flex-1 bg-black">
      <View className="px-6 pt-16 pb-4 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-bold">My Wardrobe</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/wardrobe/add')}
          className="bg-white rounded-full px-4 py-2"
        >
          <Text className="text-black font-semibold text-sm">+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">Loading wardrobe...</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-white text-xl font-bold mb-2">Start building your closet</Text>
          <Text className="text-gray-400 text-center">
            Add your first item to get personalized outfit suggestions.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-1 m-1 bg-gray-900 rounded-xl overflow-hidden aspect-square"
              onLongPress={() => handleLongPress(item)}
              delayLongPress={400}
              activeOpacity={0.9}
            >
              {item.photo_thumbnail_url ? (
                <Image
                  source={{ uri: item.photo_thumbnail_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 justify-center items-center">
                  <Text className="text-gray-500 text-xs capitalize">{item.item_type}</Text>
                  {item.label && (
                    <Text className="text-gray-400 text-sm font-medium mt-1">{item.label}</Text>
                  )}
                </View>
              )}

              {(item.classification_status === 'pending' ||
                item.classification_status === 'processing') && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <Text className="text-white text-xs font-medium">Analysing...</Text>
                </View>
              )}
              {item.classification_status === 'failed' && (
                <View
                  className="absolute bottom-0 left-0 right-0 px-2 py-1"
                  style={{ backgroundColor: 'rgba(127,29,29,0.8)' }}
                >
                  <Text className="text-red-300 text-xs">Analysis failed</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}
