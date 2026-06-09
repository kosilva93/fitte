import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/store/authStore';
import { apiGet, apiPatch } from '@/utils/api';
import { router } from 'expo-router';
import { UserProfile } from '@/types';

const BG = '#060912';
const SURFACE = '#0B1020';
const SURFACE_SOFT = '#11162A';
const BORDER = 'rgba(255,255,255,0.10)';
const BORDER_PURPLE = 'rgba(139,92,246,0.35)';
const TEXT = '#F5F6FA';
const MUTED = '#9CA3AF';
const PURPLE_BRIGHT = '#A78BFA';
const PURPLE = '#8B5CF6';

const TIER_LABELS = { free: 'Free', pro: 'Pro', premium: 'Premium' };

const GENDER_OPTIONS = [
  { value: 'menswear', label: 'Menswear' },
  { value: 'womenswear', label: 'Womenswear' },
  { value: 'unisex', label: 'Unisex' },
];
const BODY_TYPE_OPTIONS = ['slim', 'athletic', 'straight', 'broad', 'curvy'];
const AESTHETIC_OPTIONS = [
  'Minimalist', 'Streetwear', 'Business Casual', 'Old Money',
  'Y2K', 'Bohemian', 'Athleisure', 'Smart Casual', 'Techwear',
  'Preppy', 'Vintage', 'Avant-garde',
];
const BUDGET_OPTIONS = [
  { value: 5000, label: 'Under $50' },
  { value: 15000, label: '$50–$150' },
  { value: 30000, label: '$150–$300' },
  { value: 99999, label: '$300+' },
];

type ProfileData = UserProfile & { gender?: string; body_type?: string; aesthetics?: string[] };

export default function ProfileScreen() {
  const { user, userTier, signOut } = useAuthStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => apiGet<{ profile: ProfileData }>('/profile'),
    enabled: !!user?.id,
  });

  const profile = data?.profile;

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    age: '',
    city: '',
    gender: '',
    body_type: '',
    budget_max: '',
    aesthetics: [] as string[],
    preferred_brands: '',
    staple_items: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      age: profile.age?.toString() ?? '',
      city: profile.city ?? '',
      gender: profile.gender ?? '',
      body_type: profile.body_type ?? '',
      budget_max: profile.budget_max?.toString() ?? '',
      aesthetics: profile.aesthetics ?? [],
      preferred_brands: profile.preferred_brands?.join(', ') ?? '',
      staple_items: profile.staple_items?.join(', ') ?? '',
    });
  }, [profile]);

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: () =>
      apiPatch('/profile', {
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        age: form.age ? parseInt(form.age) : undefined,
        city: form.city || undefined,
        gender: form.gender || undefined,
        body_type: form.body_type || undefined,
        budget_max: form.budget_max ? parseInt(form.budget_max) : undefined,
        aesthetics: form.aesthetics,
        preferred_brands: form.preferred_brands
          ? form.preferred_brands.split(',').map((b) => b.trim()).filter(Boolean)
          : [],
        staple_items: form.staple_items
          ? form.staple_items.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function toggleAesthetic(value: string) {
    setForm((prev) => ({
      ...prev,
      aesthetics: prev.aesthetics.includes(value)
        ? prev.aesthetics.filter((a) => a !== value)
        : prev.aesthetics.length < 3
        ? [...prev.aesthetics, value]
        : prev.aesthetics,
    }));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    signOut();
    router.replace('/(auth)/sign-in');
  }

  async function handleDevReset() {
    await AsyncStorage.clear();
    await supabase.auth.signOut();
    queryClient.clear();
    signOut();
    router.replace('/onboarding');
  }

  const readOnlyFields = [
    { label: 'Name', value: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined },
    { label: 'Age', value: profile?.age?.toString() },
    { label: 'City', value: profile?.city },
    { label: 'Style identity', value: profile?.gender },
    { label: 'Body type', value: profile?.body_type },
    { label: 'Aesthetics', value: profile?.aesthetics?.join(', ') },
    { label: 'Preferred brands', value: profile?.preferred_brands?.join(', ') },
    { label: 'Staples', value: profile?.staple_items?.join(', ') },
  ].filter((f) => f.value);

  const INPUT_STYLE = {
    backgroundColor: SURFACE_SOFT,
    color: TEXT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14 as const,
    borderWidth: 1,
    borderColor: BORDER,
  };

  const SECTION_LABEL = {
    color: MUTED,
    fontSize: 11 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: 16,
      }}>
        <Text style={{ color: TEXT, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>Profile</Text>
        {!editing && (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            activeOpacity={0.7}
            style={{ borderWidth: 1, borderColor: BORDER_PURPLE, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: PURPLE_BRIGHT, fontSize: 13, fontWeight: '500' }}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {saved && (
          <View style={{ backgroundColor: 'rgba(20,83,45,0.25)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.2)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: '#4ade80', fontSize: 13 }}>Profile updated successfully.</Text>
          </View>
        )}

        {/* Account info */}
        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER }}>
          <Text style={SECTION_LABEL}>Email</Text>
          <Text style={{ color: TEXT, fontSize: 14 }}>{user?.email}</Text>
        </View>

        <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER }}>
          <Text style={SECTION_LABEL}>Subscription</Text>
          <Text style={{ color: TEXT, fontSize: 15, fontWeight: '600' }}>{TIER_LABELS[userTier]}</Text>
          {userTier === 'free' && (
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
              Upgrade to Pro for unlimited outfits and gap analysis.
            </Text>
          )}
        </View>

        {isLoading ? (
          <Text style={{ color: MUTED, fontSize: 14 }}>Loading profile...</Text>
        ) : editing ? (
          <View style={{ gap: 20 }}>
            {/* Name */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={SECTION_LABEL}>First name</Text>
                <TextInput
                  value={form.first_name}
                  onChangeText={(v) => setForm((p) => ({ ...p, first_name: v }))}
                  placeholder="e.g. Alex"
                  placeholderTextColor="#6b7280"
                  style={INPUT_STYLE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={SECTION_LABEL}>Last name</Text>
                <TextInput
                  value={form.last_name}
                  onChangeText={(v) => setForm((p) => ({ ...p, last_name: v }))}
                  placeholder="e.g. Smith"
                  placeholderTextColor="#6b7280"
                  style={INPUT_STYLE}
                />
              </View>
            </View>

            {/* Age & City */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={SECTION_LABEL}>Age</Text>
                <TextInput
                  value={form.age}
                  onChangeText={(v) => setForm((p) => ({ ...p, age: v }))}
                  keyboardType="number-pad"
                  placeholderTextColor="#6b7280"
                  style={INPUT_STYLE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={SECTION_LABEL}>City</Text>
                <TextInput
                  value={form.city}
                  onChangeText={(v) => setForm((p) => ({ ...p, city: v }))}
                  placeholder="e.g. London"
                  placeholderTextColor="#6b7280"
                  style={INPUT_STYLE}
                />
              </View>
            </View>

            {/* Style identity */}
            <View>
              <Text style={SECTION_LABEL}>Style identity</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {GENDER_OPTIONS.map((opt) => {
                  const active = form.gender === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setForm((p) => ({ ...p, gender: opt.value }))}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        alignItems: 'center',
                        borderColor: active ? PURPLE : BORDER,
                        backgroundColor: active ? 'rgba(139,92,246,0.15)' : SURFACE_SOFT,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '500', color: active ? PURPLE_BRIGHT : MUTED }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Body type */}
            <View>
              <Text style={SECTION_LABEL}>Body type</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {BODY_TYPE_OPTIONS.map((bt) => {
                  const active = form.body_type === bt;
                  return (
                    <TouchableOpacity
                      key={bt}
                      onPress={() => setForm((p) => ({ ...p, body_type: bt }))}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? PURPLE : BORDER,
                        backgroundColor: active ? 'rgba(139,92,246,0.15)' : SURFACE_SOFT,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '500', textTransform: 'capitalize', color: active ? PURPLE_BRIGHT : MUTED }}>
                        {bt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Budget */}
            <View>
              <Text style={SECTION_LABEL}>Budget per item</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {BUDGET_OPTIONS.map((opt) => {
                  const active = form.budget_max === opt.value.toString();
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setForm((p) => ({ ...p, budget_max: opt.value.toString() }))}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? PURPLE : BORDER,
                        backgroundColor: active ? 'rgba(139,92,246,0.15)' : SURFACE_SOFT,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '500', color: active ? PURPLE_BRIGHT : MUTED }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Aesthetics */}
            <View>
              <Text style={SECTION_LABEL}>
                Aesthetics <Text style={{ color: '#6B7280' }}>(up to 3)</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {AESTHETIC_OPTIONS.map((a) => {
                  const selected = form.aesthetics.includes(a);
                  const maxed = !selected && form.aesthetics.length >= 3;
                  return (
                    <TouchableOpacity
                      key={a}
                      onPress={() => toggleAesthetic(a)}
                      disabled={maxed}
                      activeOpacity={0.8}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: selected ? PURPLE : BORDER,
                        backgroundColor: selected ? 'rgba(139,92,246,0.15)' : SURFACE_SOFT,
                        opacity: maxed ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: selected ? PURPLE_BRIGHT : MUTED, fontWeight: selected ? '600' : '400' }}>
                        {a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Brands */}
            <View>
              <Text style={SECTION_LABEL}>Preferred brands</Text>
              <TextInput
                value={form.preferred_brands}
                onChangeText={(v) => setForm((p) => ({ ...p, preferred_brands: v }))}
                placeholder="e.g. Zara, Nike, COS"
                placeholderTextColor="#6b7280"
                style={INPUT_STYLE}
              />
            </View>

            {/* Staples */}
            <View>
              <Text style={SECTION_LABEL}>Wardrobe staples</Text>
              <TextInput
                value={form.staple_items}
                onChangeText={(v) => setForm((p) => ({ ...p, staple_items: v }))}
                placeholder="e.g. white tee, black jeans"
                placeholderTextColor="#6b7280"
                style={INPUT_STYLE}
              />
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                activeOpacity={0.7}
                style={{ flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveProfile()}
                disabled={isPending}
                activeOpacity={0.85}
                style={{ flex: 1, backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: isPending ? 0.5 : 1 }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  {isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {readOnlyFields.map(({ label, value }) => (
              <View key={label} style={{ backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ color: MUTED, fontSize: 13 }}>{label}</Text>
                <Text style={{ color: TEXT, fontSize: 13, textTransform: 'capitalize', flexShrink: 1, marginLeft: 16, textAlign: 'right' }}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push('/privacy' as never)}
          activeOpacity={0.7}
          style={{ backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 }}
        >
          <Text style={{ color: MUTED, fontSize: 14, fontWeight: '500' }}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          style={{ backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#f87171', fontSize: 14, fontWeight: '500' }}>Sign Out</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            onPress={handleDevReset}
            activeOpacity={0.7}
            style={{ borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '500' }}>⚠ Reset onboarding (dev only)</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
