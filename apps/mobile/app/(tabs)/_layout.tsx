import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const BG = '#060912';
const SURFACE = '#0B1020';
const BORDER = 'rgba(255,255,255,0.10)';
const PURPLE_BRIGHT = '#A78BFA';
const PURPLE = '#8B5CF6';
const MUTED = '#6b7280';

const TAB_ICONS: Record<string, { icon: string; label: string }> = {
  index:   { icon: '🏠', label: 'Home' },
  wardrobe: { icon: '👔', label: 'Wardrobe' },
  outfits: { icon: '✨', label: 'Outfits' },
  profile: { icon: '👤', label: 'Profile' },
};

const VISIBLE_TABS = ['index', 'wardrobe', 'outfits', 'profile'];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const visibleRoutes = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));
  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);

  function renderTab(route: typeof state.routes[0]) {
    const isFocused = state.routes[state.index]?.name === route.name;
    const meta = TAB_ICONS[route.name];
    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        activeOpacity={0.7}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 64 }}
      >
        <Text style={{ fontSize: 19, marginBottom: 2, opacity: isFocused ? 1 : 0.45 }}>
          {meta?.icon ?? '•'}
        </Text>
        <Text style={{
          fontSize: 10,
          fontWeight: isFocused ? '600' : '400',
          color: isFocused ? PURPLE_BRIGHT : MUTED,
        }}>
          {meta?.label ?? route.name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{
      position: 'absolute',
      bottom: Math.max(insets.bottom, 8) + 10,
      left: 20,
      right: 20,
    }}>
      {/* Floating tab bar */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: SURFACE,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: BORDER,
        height: 64,
        alignItems: 'center',
      }}>
        {left.map(renderTab)}
        {/* FAB spacer */}
        <View style={{ width: 64 }} />
        {right.map(renderTab)}
      </View>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/wardrobe/add')}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          top: -24,
          alignSelf: 'center',
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: PURPLE,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 4,
          borderColor: BG,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '300' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits' }} />
      <Tabs.Screen name="gaps" options={{ title: 'Gaps', href: null }} />
      <Tabs.Screen name="trends" options={{ title: 'Trends', href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
