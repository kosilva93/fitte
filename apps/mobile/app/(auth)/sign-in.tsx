import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { Alert.alert('Sign in failed', error.message); return; }
    router.replace('/(tabs)/wardrobe');
  }

  async function handleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { Alert.alert('Sign up failed', error.message); return; }
    router.replace('/profile-setup' as never);
  }

  async function handleResetPassword() {
    if (!email) { Alert.alert('Enter your email first'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) { Alert.alert('Reset failed', error.message); return; }
    setResetSent(true);
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

      {!showReset ? (
        <>
          <TextInput
            className="bg-gray-900 text-white rounded-xl px-4 py-4 mb-2"
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={() => setShowReset(true)} className="mb-6 self-end">
            <Text className="text-gray-500 text-sm">Forgot password?</Text>
          </TouchableOpacity>

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
        </>
      ) : resetSent ? (
        <View className="bg-gray-900 rounded-xl p-4 mb-4">
          <Text className="text-green-400 text-sm text-center">
            Check your email for a password reset link.
          </Text>
          <TouchableOpacity onPress={() => { setShowReset(false); setResetSent(false); }} className="mt-3">
            <Text className="text-gray-400 text-sm text-center">Back to sign in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            className="bg-white rounded-xl py-4 mb-3"
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text className="text-black text-center font-semibold text-base">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowReset(false)}>
            <Text className="text-gray-500 text-sm text-center">Back to sign in</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
