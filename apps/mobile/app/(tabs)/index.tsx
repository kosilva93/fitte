import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { apiGet } from '@/utils/api';
import type { WardrobeItem, GeneratedOutfit } from '@/types';

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE_BRIGHT = '#A78BFA';
const GOLD = '#C9A84C';

const OCCASIONS = [
  { id: 'work', label: 'Work', sub: 'Smart & professional' },
  { id: 'dinner', label: 'Dinner', sub: 'Polished & elegant' },
  { id: 'casual', label: 'Casual', sub: 'Relaxed & effortless' },
  { id: 'weekend', label: 'Weekend', sub: 'Comfortable & stylish' },
  { id: 'date', label: 'Date night', sub: 'Confident & stylish' },
];

const QUICK_ACTIONS = [
  { id: 'add', label: 'Add new item', icon: '＋', route: '/wardrobe/add' },
  { id: 'outfits', label: 'Get outfit ideas', icon: '✦', route: '/(tabs)/outfits' },
  { id: 'lookbook', label: 'My lookbook', icon: '♡', route: '/(tabs)/outfits' },
  { id: 'gaps', label: 'Gap analysis', icon: '◈', route: '/(tabs)/gaps' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const firstName = user?.email?.split('@')[0] ?? 'there';

  const { data: wardrobeData } = useQuery({
    queryKey: ['wardrobe'],
    queryFn: () => apiGet<{ items: WardrobeItem[] }>('/wardrobe'),
  });

  const { data: lookbookData } = useQuery({
    queryKey: ['outfits'],
    queryFn: () => apiGet<{ outfits: GeneratedOutfit[] }>('/outfits'),
  });

  const itemCount = wardrobeData?.items?.length ?? 0;
  const recentOutfits = (lookbookData?.outfits ?? []).slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 110 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>Fitte</Text>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 17 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ color: TEXT, fontSize: 27, fontWeight: '700', letterSpacing: -0.5 }}>
            {getGreeting()}, {firstName}{' '}
            <Text style={{ color: GOLD }}>✦</Text>
          </Text>
          <Text style={{ color: MUTED, fontSize: 15, marginTop: 5 }}>Let's find your perfect look.</Text>
        </View>

        {/* Wardrobe summary card */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/wardrobe')}
          activeOpacity={0.85}
          style={{
            marginHorizontal: 20,
            backgroundColor: SURFACE,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(139,92,246,0.35)',
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <View style={{ width: 50, height: 50, borderRadius: 15, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Text style={{ fontSize: 22 }}>👔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: MUTED, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 }}>Your wardrobe</Text>
            <Text style={{ color: TEXT, fontSize: 24, fontWeight: '700' }}>
              {itemCount}
              <Text style={{ color: MUTED, fontSize: 14, fontWeight: '400' }}> items</Text>
            </Text>
          </View>
          <View style={{ backgroundColor: SURFACE_SOFT, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: PURPLE_BRIGHT, fontSize: 13, fontWeight: '600' }}>View closet</Text>
            <Text style={{ color: PURPLE_BRIGHT, fontSize: 14 }}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Occasions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 }}>
          <Text style={{ color: TEXT, fontSize: 17, fontWeight: '600' }}>What's the occasion?</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/outfits')}>
            <Text style={{ color: PURPLE_BRIGHT, fontSize: 13 }}>Style me →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}
        >
          {OCCASIONS.map((occ) => (
            <TouchableOpacity
              key={occ.id}
              onPress={() => router.push('/(tabs)/outfits')}
              activeOpacity={0.75}
              style={{
                backgroundColor: SURFACE,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: BORDER,
                paddingHorizontal: 16,
                paddingVertical: 14,
                width: 128,
              }}
            >
              <Text style={{ color: TEXT, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>{occ.label}</Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>{occ.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI outfit suggestions */}
        {recentOutfits.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 }}>
              <Text style={{ color: TEXT, fontSize: 17, fontWeight: '600' }}>AI outfit suggestions</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/outfits')}>
                <Text style={{ color: PURPLE_BRIGHT, fontSize: 13 }}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
            >
              {recentOutfits.map((outfit, i) => (
                <View
                  key={outfit.id}
                  style={{
                    width: 155,
                    backgroundColor: SURFACE,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: i === 0 ? 'rgba(139,92,246,0.55)' : BORDER,
                    overflow: 'hidden',
                  }}
                >
                  {outfit.image_url ? (
                    <Image source={{ uri: outfit.image_url }} style={{ width: 155, height: 155 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 155, height: 155, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: MUTED, fontSize: 28 }}>✦</Text>
                    </View>
                  )}
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{outfit.occasion}</Text>
                    <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{outfit.vibe ?? ''}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick actions */}
        <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
          <Text style={{ color: TEXT, fontSize: 17, fontWeight: '600', marginBottom: 14 }}>Quick actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
                style={{
                  width: '47%',
                  backgroundColor: SURFACE,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: BORDER,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: SURFACE_SOFT, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: PURPLE_BRIGHT, fontSize: 17, fontWeight: '500' }}>{action.icon}</Text>
                </View>
                <Text style={{ color: TEXT, fontSize: 13, fontWeight: '500', flex: 1 }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
