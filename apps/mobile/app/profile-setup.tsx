import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPatch } from '@/utils/api';

const GENDER_OPTIONS = [
  { value: 'menswear', label: 'Menswear' },
  { value: 'womenswear', label: 'Womenswear' },
  { value: 'unisex', label: 'Unisex / Both' },
];
const BODY_TYPE_OPTIONS = ['slim', 'athletic', 'straight', 'broad', 'curvy'];
const AESTHETIC_OPTIONS = [
  'Minimalist', 'Streetwear', 'Business Casual', 'Old Money',
  'Y2K', 'Bohemian', 'Athleisure', 'Smart Casual', 'Techwear',
  'Preppy', 'Vintage', 'Avant-garde',
];
const BUDGET_OPTIONS = [
  { value: '5000', label: 'Under $50' },
  { value: '15000', label: '$50–$150' },
  { value: '30000', label: '$150–$300' },
  { value: '99999', label: '$300+' },
];

export default function ProfileSetupScreen() {
  const [gender, setGender] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [aesthetics, setAesthetics] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleAesthetic(a: string) {
    setAesthetics((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : prev.length < 3 ? [...prev, a] : prev
    );
  }

  async function handleComplete() {
    if (!gender) {
      setError('Please select your style identity to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiPatch('/profile', {
        gender,
        body_type: bodyType || undefined,
        aesthetics,
        budget_max: budget ? parseInt(budget) : undefined,
        age: age ? parseInt(age) : undefined,
        city: city || undefined,
        profile_complete: true,
      });
      await AsyncStorage.setItem('profile_setup_complete', 'true');
      router.replace('/(tabs)/wardrobe');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    await AsyncStorage.setItem('profile_setup_complete', 'true');
    router.replace('/(tabs)/wardrobe');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000' }}
      contentContainerStyle={{ paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 8 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
          Set up your style profile
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 15, lineHeight: 22 }}>
          This helps Fitte tailor outfit suggestions to you. You can always update it later.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 32, gap: 28 }}>

        {/* Style identity — required */}
        <View>
          <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Style identity *
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GENDER_OPTIONS.map((opt) => {
              const active = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setGender(opt.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? '#fff' : '#374151',
                    backgroundColor: active ? '#fff' : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: active ? '#000' : '#9ca3af', fontSize: 12, fontWeight: '600' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Body type */}
        <View>
          <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Body type
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BODY_TYPE_OPTIONS.map((bt) => {
              const active = bodyType === bt;
              return (
                <TouchableOpacity
                  key={bt}
                  onPress={() => setBodyType(active ? '' : bt)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? '#fff' : '#374151',
                    backgroundColor: active ? '#fff' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? '#000' : '#9ca3af', fontSize: 13, textTransform: 'capitalize', fontWeight: '500' }}>
                    {bt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Aesthetics */}
        <View>
          <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Aesthetics
          </Text>
          <Text style={{ color: '#4b5563', fontSize: 12, marginBottom: 10 }}>Pick up to 3</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {AESTHETIC_OPTIONS.map((a) => {
              const active = aesthetics.includes(a);
              const maxed = !active && aesthetics.length >= 3;
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => toggleAesthetic(a)}
                  disabled={maxed}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: active ? '#fff' : '#374151',
                    backgroundColor: active ? '#fff' : 'transparent',
                    opacity: maxed ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: active ? '#000' : '#9ca3af', fontSize: 13, fontWeight: active ? '600' : '400' }}>
                    {a}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Budget */}
        <View>
          <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Budget per item
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BUDGET_OPTIONS.map((opt) => {
              const active = budget === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setBudget(active ? '' : opt.value)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? '#fff' : '#374151',
                    backgroundColor: active ? '#fff' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? '#000' : '#9ca3af', fontSize: 13, fontWeight: '500' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Age & City */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Age
            </Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="e.g. 28"
              placeholderTextColor="#4b5563"
              style={{ backgroundColor: '#111827', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              City
            </Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. London"
              placeholderTextColor="#4b5563"
              style={{ backgroundColor: '#111827', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14 }}
            />
          </View>
        </View>

        {error ? (
          <Text style={{ color: '#f87171', fontSize: 13 }}>{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleComplete}
          disabled={loading}
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: loading ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: '#000', fontWeight: '600', fontSize: 16 }}>Complete Setup</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ color: '#4b5563', fontSize: 14 }}>Skip for now</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
