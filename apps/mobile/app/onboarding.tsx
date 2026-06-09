import { useState, useRef, useLayoutEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BG = '#060912';
const SURFACE = '#0D1117';
const BORDER = 'rgba(255,255,255,0.08)';
const PURPLE = '#8B5CF6';
const PURPLE_BG = 'rgba(139,92,246,0.12)';
const PURPLE_BORDER = 'rgba(139,92,246,0.45)';
const TEXT = '#F9FAFB';
const MUTED = '#9ca3af';
const MUTED_DIM = '#4b5563';
const GOLD = '#C9A84C';

const GENDER_CARDS = [
  { value: 'menswear', label: 'Menswear', desc: "Men's clothing & accessories", icon: '🧥' },
  { value: 'womenswear', label: 'Womenswear', desc: "Women's clothing & accessories", icon: '👗' },
  { value: 'unisex', label: 'Both / Unisex', desc: 'I shop across all sections', icon: '✨' },
];

const AESTHETICS = [
  'Minimalist', 'Streetwear', 'Business Casual', 'Old Money',
  'Y2K', 'Bohemian', 'Athleisure', 'Smart Casual', 'Techwear',
  'Preppy', 'Vintage', 'Avant-garde',
];

const OCCASIONS = [
  { label: 'Everyday casual', icon: '☀️' },
  { label: 'Work & office', icon: '💼' },
  { label: 'Date nights', icon: '🕯️' },
  { label: 'Going out', icon: '🎉' },
  { label: 'Gym & sport', icon: '🏋️' },
  { label: 'Formal events', icon: '🎩' },
  { label: 'Travel', icon: '✈️' },
  { label: 'Weekend brunch', icon: '🥂' },
];

const TOTAL_QUIZ_STEPS = 3;

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState('');
  const [aesthetics, setAesthetics] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useLayoutEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [step]);

  function next() {
    setStep(s => s + 1);
  }

  function toggleAesthetic(a: string) {
    setAesthetics(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : prev.length < 3 ? [...prev, a] : prev
    );
  }

  function toggleOccasion(o: string) {
    setOccasions(prev =>
      prev.includes(o) ? prev.filter(x => x !== o) : prev.length < 3 ? [...prev, o] : prev
    );
  }

  async function finish() {
    await AsyncStorage.multiSet([
      ['onboarding_complete', 'true'],
      ['onboarding_data', JSON.stringify({ gender, aesthetics, occasions })],
    ]);
    router.replace('/(auth)/sign-in');
  }

  const quizStep = step >= 1 && step <= TOTAL_QUIZ_STEPS ? step : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {quizStep !== null && (
          <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {Array.from({ length: TOTAL_QUIZ_STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: i < quizStep ? PURPLE : 'rgba(255,255,255,0.07)',
                  }}
                />
              ))}
            </View>
          </View>
        )}

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && (
            <StepGender
              selected={gender}
              onSelect={(g) => { setGender(g); setTimeout(next, 300); }}
            />
          )}
          {step === 2 && (
            <StepAesthetics selected={aesthetics} onToggle={toggleAesthetic} onNext={next} />
          )}
          {step === 3 && (
            <StepOccasions selected={occasions} onToggle={toggleOccasion} onNext={next} />
          )}
          {step === 4 && (
            <StepReady gender={gender} aesthetics={aesthetics} occasions={occasions} onFinish={finish} />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 48, paddingBottom: 48 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: TEXT, fontSize: 52, fontWeight: '800', letterSpacing: -2, marginBottom: 4 }}>
          Fitte <Text style={{ color: GOLD }}>✦</Text>
        </Text>
        <Text style={{ color: TEXT, fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5, marginBottom: 16, marginTop: 24 }}>
          Your AI personal stylist
        </Text>
        <Text style={{ color: MUTED, fontSize: 16, textAlign: 'center', lineHeight: 26, maxWidth: 300 }}>
          Answer 3 quick questions and Fitte will build a style profile tailored to you.
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <TouchableOpacity
          onPress={onNext}
          style={{ backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 }}>
            Get started
          </Text>
        </TouchableOpacity>
        <Text style={{ color: MUTED_DIM, textAlign: 'center', fontSize: 12, lineHeight: 18 }}>
          Free 7-day trial · No credit card required to start
        </Text>
      </View>
    </View>
  );
}

function StepGender({ selected, onSelect }: { selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 48 }}>
      <Text style={{ color: TEXT, fontSize: 26, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 }}>
        How do you shop?
      </Text>
      <Text style={{ color: MUTED, fontSize: 15, marginBottom: 36 }}>
        This lets us show only styles that are relevant to you.
      </Text>
      <View style={{ gap: 14 }}>
        {GENDER_CARDS.map((card) => {
          const active = selected === card.value;
          return (
            <TouchableOpacity
              key={card.value}
              onPress={() => onSelect(card.value)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: active ? PURPLE_BG : SURFACE,
                borderWidth: 1.5,
                borderColor: active ? PURPLE_BORDER : BORDER,
                borderRadius: 18,
                padding: 20,
                gap: 16,
              }}
            >
              <Text style={{ fontSize: 26 }}>{card.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT, fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
                  {card.label}
                </Text>
                <Text style={{ color: MUTED, fontSize: 13 }}>{card.desc}</Text>
              </View>
              <View style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: active ? PURPLE : MUTED_DIM,
                backgroundColor: active ? PURPLE : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function StepAesthetics({
  selected, onToggle, onNext,
}: {
  selected: string[];
  onToggle: (a: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 24 }}>
        <Text style={{ color: TEXT, fontSize: 26, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 }}>
          What's your vibe?
        </Text>
        <Text style={{ color: MUTED, fontSize: 15 }}>
          Pick up to 3 styles that feel like you.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {AESTHETICS.map((a) => {
            const active = selected.includes(a);
            const maxed = !active && selected.length >= 3;
            return (
              <TouchableOpacity
                key={a}
                onPress={() => onToggle(a)}
                disabled={maxed}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: active ? PURPLE_BORDER : BORDER,
                  backgroundColor: active ? PURPLE_BG : SURFACE,
                  opacity: maxed ? 0.3 : 1,
                }}
              >
                <Text style={{ color: active ? '#A78BFA' : MUTED, fontSize: 14, fontWeight: active ? '600' : '400' }}>
                  {a}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={onNext}
          disabled={selected.length === 0}
          activeOpacity={0.85}
          style={{
            backgroundColor: selected.length > 0 ? PURPLE : SURFACE,
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: selected.length > 0 ? 'transparent' : BORDER,
          }}
        >
          <Text style={{ color: selected.length > 0 ? '#fff' : MUTED_DIM, fontSize: 16, fontWeight: '600' }}>
            Continue {selected.length > 0 ? `(${selected.length} selected)` : ''}
          </Text>
        </TouchableOpacity>
        {selected.length === 0 && (
          <TouchableOpacity onPress={onNext} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ color: MUTED_DIM, fontSize: 13 }}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function StepOccasions({
  selected, onToggle, onNext,
}: {
  selected: string[];
  onToggle: (o: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 24 }}>
        <Text style={{ color: TEXT, fontSize: 26, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 }}>
          What do you dress for?
        </Text>
        <Text style={{ color: MUTED, fontSize: 15 }}>
          Pick up to 3 — we'll focus suggestions around your real life.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OCCASIONS.map((o) => {
            const active = selected.includes(o.label);
            const maxed = !active && selected.length >= 3;
            return (
              <TouchableOpacity
                key={o.label}
                onPress={() => onToggle(o.label)}
                disabled={maxed}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: active ? PURPLE_BORDER : BORDER,
                  backgroundColor: active ? PURPLE_BG : SURFACE,
                  opacity: maxed ? 0.3 : 1,
                }}
              >
                <Text style={{ fontSize: 15 }}>{o.icon}</Text>
                <Text style={{ color: active ? '#A78BFA' : MUTED, fontSize: 14, fontWeight: active ? '600' : '400' }}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 }}>
        <TouchableOpacity
          onPress={onNext}
          disabled={selected.length === 0}
          activeOpacity={0.85}
          style={{
            backgroundColor: selected.length > 0 ? PURPLE : SURFACE,
            borderRadius: 16,
            paddingVertical: 17,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: selected.length > 0 ? 'transparent' : BORDER,
          }}
        >
          <Text style={{ color: selected.length > 0 ? '#fff' : MUTED_DIM, fontSize: 16, fontWeight: '600' }}>
            Continue {selected.length > 0 ? `(${selected.length} selected)` : ''}
          </Text>
        </TouchableOpacity>
        {selected.length === 0 && (
          <TouchableOpacity onPress={onNext} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ color: MUTED_DIM, fontSize: 13 }}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function StepReady({
  gender, aesthetics, occasions, onFinish,
}: {
  gender: string;
  aesthetics: string[];
  occasions: string[];
  onFinish: () => void;
}) {
  const genderLabel = GENDER_CARDS.find(g => g.value === gender)?.label ?? '';
  const tags = [genderLabel, ...aesthetics, ...occasions].filter(Boolean);

  return (
    <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 48, paddingBottom: 48 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: PURPLE_BG, borderWidth: 1.5, borderColor: PURPLE_BORDER,
          alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 28,
        }}>
          <Text style={{ fontSize: 32 }}>✦</Text>
        </View>

        <Text style={{ color: TEXT, fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12, letterSpacing: -0.4 }}>
          Your style profile is ready
        </Text>
        <Text style={{ color: MUTED, fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          Fitte will personalise every outfit suggestion from day one.
        </Text>

        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20, backgroundColor: PURPLE_BG,
                  borderWidth: 1, borderColor: PURPLE_BORDER,
                }}
              >
                <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '500' }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ gap: 14 }}>
        <TouchableOpacity
          onPress={onFinish}
          activeOpacity={0.85}
          style={{ backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Create free account →</Text>
        </TouchableOpacity>
        <Text style={{ color: MUTED_DIM, textAlign: 'center', fontSize: 12, lineHeight: 18 }}>
          7-day free trial · Then $4.99/week or $29.99/year · Cancel anytime
        </Text>
      </View>
    </View>
  );
}
