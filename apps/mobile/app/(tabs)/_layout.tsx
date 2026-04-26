import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#000', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits' }} />
      <Tabs.Screen name="gaps" options={{ title: 'Gaps' }} />
      <Tabs.Screen name="trends" options={{ title: 'Trends' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
