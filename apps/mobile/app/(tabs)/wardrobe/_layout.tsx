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
          headerStyle: { backgroundColor: '#060912' },
          headerTintColor: '#A78BFA',
          headerTitleStyle: { color: '#F5F6FA', fontWeight: '600' },
        }}
      />
    </Stack>
  );
}
