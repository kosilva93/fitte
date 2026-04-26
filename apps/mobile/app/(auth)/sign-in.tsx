import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Sign in failed', error.message);
      return;
    }

    router.replace('/(tabs)/wardrobe');
  }

  async function handleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }

    router.replace('/(tabs)/wardrobe');
  }

  return (
    <View className="flex-1 bg-black justify-center px-6">
      <Text className="text-white text-4xl font-bold mb-2">Fitte</Text>
      <Text className="text-gray-400 text-base mb-10">Your AI personal stylist</Text>

      <TextInput
        className="bg-gray-900 text-white rounded-xl px-4 py-4 mb-4"
        placeholder="Email"
        placeholderTextColor="#6b7280"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="bg-gray-900 text-white rounded-xl px-4 py-4 mb-6"
        placeholder="Password"
        placeholderTextColor="#6b7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-white rounded-xl py-4 mb-3"
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text className="text-black text-center font-semibold text-base">
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="border border-gray-700 rounded-xl py-4"
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold text-base">Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}
