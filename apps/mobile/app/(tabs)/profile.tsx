import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/store/authStore';
import { apiGet, apiPatch } from '@/utils/api';
import { router } from 'expo-router';
import { UserProfile } from '@/types';

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
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<{ profile: ProfileData }>('/profile'),
  });

  const profile = data?.profile;

  const [form, setForm] = useState({
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
    signOut();
    router.replace('/(auth)/sign-in');
  }

  const readOnlyFields = [
    { label: 'Age', value: profile?.age?.toString() },
    { label: 'City', value: profile?.city },
    { label: 'Style identity', value: profile?.gender },
    { label: 'Body type', value: profile?.body_type },
    { label: 'Aesthetics', value: profile?.aesthetics?.join(', ') },
    { label: 'Preferred brands', value: profile?.preferred_brands?.join(', ') },
    { label: 'Staples', value: profile?.staple_items?.join(', ') },
  ].filter((f) => f.value);

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">Profile</Text>
        {!editing && (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            className="border border-gray-700 rounded-xl px-4 py-2"
          >
            <Text className="text-gray-400 text-sm">Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="px-6 space-y-4">
        {saved && (
          <View className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
            <Text className="text-green-400 text-sm">Profile updated successfully.</Text>
          </View>
        )}

        {/* Account info */}
        <View className="bg-gray-900 rounded-xl p-4">
          <Text className="text-gray-500 text-xs uppercase mb-1">Email</Text>
          <Text className="text-white">{user?.email}</Text>
        </View>

        <View className="bg-gray-900 rounded-xl p-4">
          <Text className="text-gray-500 text-xs uppercase mb-1">Subscription</Text>
          <Text className="text-white font-semibold">{TIER_LABELS[userTier]}</Text>
          {userTier === 'free' && (
            <Text className="text-gray-500 text-xs mt-1">
              Upgrade to Pro for unlimited outfits and gap analysis.
            </Text>
          )}
        </View>

        {isLoading ? (
          <Text className="text-gray-500 text-sm">Loading profile...</Text>
        ) : editing ? (
          <View className="space-y-6">
            {/* Age & City */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-1">Age</Text>
                <TextInput
                  value={form.age}
                  onChangeText={(v) => setForm((p) => ({ ...p, age: v }))}
                  keyboardType="number-pad"
                  placeholderTextColor="#6b7280"
                  className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs mb-1">City</Text>
                <TextInput
                  value={form.city}
                  onChangeText={(v) => setForm((p) => ({ ...p, city: v }))}
                  placeholder="e.g. London"
                  placeholderTextColor="#6b7280"
                  className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm"
                />
              </View>
            </View>

            {/* Style identity */}
            <View>
              <Text className="text-gray-500 text-xs mb-2">Style identity</Text>
              <View className="flex-row gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setForm((p) => ({ ...p, gender: opt.value }))}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      form.gender === opt.value
                        ? 'bg-white border-white'
                        : 'border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        form.gender === opt.value ? 'text-black' : 'text-gray-400'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Body type */}
            <View>
              <Text className="text-gray-500 text-xs mb-2">Body type</Text>
              <View className="flex-row gap-2 flex-wrap">
                {BODY_TYPE_OPTIONS.map((bt) => (
                  <TouchableOpacity
                    key={bt}
                    onPress={() => setForm((p) => ({ ...p, body_type: bt }))}
                    className={`px-3 py-2 rounded-xl border capitalize ${
                      form.body_type === bt
                        ? 'bg-white border-white'
                        : 'border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium capitalize ${
                        form.body_type === bt ? 'text-black' : 'text-gray-400'
                      }`}
                    >
                      {bt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Budget */}
            <View>
              <Text className="text-gray-500 text-xs mb-2">Budget per item</Text>
              <View className="flex-row gap-2 flex-wrap">
                {BUDGET_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setForm((p) => ({ ...p, budget_max: opt.value.toString() }))}
                    className={`px-3 py-2 rounded-xl border ${
                      form.budget_max === opt.value.toString()
                        ? 'bg-white border-white'
                        : 'border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        form.budget_max === opt.value.toString() ? 'text-black' : 'text-gray-400'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Aesthetics */}
            <View>
              <Text className="text-gray-500 text-xs mb-2">
                Aesthetics <Text className="text-gray-600">(up to 3)</Text>
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {AESTHETIC_OPTIONS.map((a) => {
                  const selected = form.aesthetics.includes(a);
                  const maxed = !selected && form.aesthetics.length >= 3;
                  return (
                    <TouchableOpacity
                      key={a}
                      onPress={() => toggleAesthetic(a)}
                      disabled={maxed}
                      className={`px-3 py-1.5 rounded-full border ${
                        selected ? 'bg-white border-white' : 'border-gray-700'
                      } ${maxed ? 'opacity-40' : ''}`}
                    >
                      <Text
                        className={`text-xs ${selected ? 'text-black font-medium' : 'text-gray-400'}`}
                      >
                        {a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Brands */}
            <View>
              <Text className="text-gray-500 text-xs mb-1">Preferred brands</Text>
              <TextInput
                value={form.preferred_brands}
                onChangeText={(v) => setForm((p) => ({ ...p, preferred_brands: v }))}
                placeholder="e.g. Zara, Nike, COS"
                placeholderTextColor="#6b7280"
                className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm"
              />
            </View>

            {/* Staples */}
            <View>
              <Text className="text-gray-500 text-xs mb-1">Wardrobe staples</Text>
              <TextInput
                value={form.staple_items}
                onChangeText={(v) => setForm((p) => ({ ...p, staple_items: v }))}
                placeholder="e.g. white tee, black jeans"
                placeholderTextColor="#6b7280"
                className="bg-gray-900 text-white rounded-xl px-4 py-3 text-sm"
              />
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 pt-2">
              <TouchableOpacity
                onPress={() => setEditing(false)}
                className="flex-1 border border-gray-700 rounded-xl py-3 items-center"
              >
                <Text className="text-white text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveProfile()}
                disabled={isPending}
                className={`flex-1 bg-white rounded-xl py-3 items-center ${isPending ? 'opacity-40' : ''}`}
              >
                <Text className="text-black text-sm font-semibold">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="space-y-2">
            {readOnlyFields.map(({ label, value }) => (
              <View key={label} className="bg-gray-900 rounded-xl px-4 py-3 flex-row justify-between items-center">
                <Text className="text-gray-500 text-sm">{label}</Text>
                <Text className="text-white text-sm capitalize flex-shrink ml-4 text-right">{value}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={handleSignOut}
          className="border border-gray-700 rounded-xl py-4 items-center mt-4"
        >
          <Text className="text-gray-500 font-medium text-sm">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
