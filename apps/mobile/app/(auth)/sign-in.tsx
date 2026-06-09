import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { apiPatch } from '@/utils/api';

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE = '#8B5CF6';
const GOLD = '#C9A84C';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
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
    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    // Save the style preferences collected during onboarding
    try {
      const raw = await AsyncStorage.getItem('onboarding_data');
      const data = raw ? JSON.parse(raw) : {};
      await apiPatch('/profile', {
        gender: data.gender || undefined,
        aesthetics: data.aesthetics?.length ? data.aesthetics : undefined,
        profile_complete: true,
      });
    } catch {
      // Non-fatal — user can refine their profile later
    }

    setLoading(false);
    router.replace('/paywall');
  }

  async function handleResetPassword() {
    if (!email) { Alert.alert('Enter your email first'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) { Alert.alert('Reset failed', error.message); return; }
    setResetSent(true);
  }

  const INPUT_STYLE = {
    backgroundColor: SURFACE_SOFT,
    color: TEXT,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15 as const,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: insets.bottom }}>
      <StatusBar barStyle="light-content" />

      {/* Logo */}
      <View style={{ marginBottom: 40 }}>
        <Text style={{ color: TEXT, fontSize: 42, fontWeight: '700', letterSpacing: -1 }}>
          Fitte <Text style={{ color: GOLD }}>✦</Text>
        </Text>
        <Text style={{ color: MUTED, fontSize: 16, marginTop: 6 }}>Your AI personal stylist</Text>
      </View>

      <TextInput
        style={INPUT_STYLE}
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
            style={[INPUT_STYLE, { marginBottom: 4 }]}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={() => setShowReset(true)} style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
            <Text style={{ color: MUTED, fontSize: 13 }}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12, opacity: loading ? 0.6 : 1 }}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={{ color: TEXT, textAlign: 'center', fontWeight: '600', fontSize: 15 }}>Create Account</Text>
          </TouchableOpacity>
        </>
      ) : resetSent ? (
        <View style={{ backgroundColor: 'rgba(20,83,45,0.25)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <Text style={{ color: '#4ade80', fontSize: 14, textAlign: 'center' }}>
            Check your email for a password reset link.
          </Text>
          <TouchableOpacity onPress={() => { setShowReset(false); setResetSent(false); }} style={{ marginTop: 12 }}>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={{ backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12, opacity: loading ? 0.6 : 1 }}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowReset(false)}>
            <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center' }}>Back to sign in</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
