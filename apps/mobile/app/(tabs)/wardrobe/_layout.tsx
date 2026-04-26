import { Stack } from 'expo-router';

export default function WardrobeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="add"
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Add Item',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { color: '#fff', fontWeight: '600' },
        }}
      />
    </Stack>
  );
}
