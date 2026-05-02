import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: '👗',
    title: 'Your AI Personal Stylist',
    description:
      'Fitte helps you look your best every day — by making the most of what you already own.',
  },
  {
    id: '2',
    icon: '📸',
    title: 'Build Your Wardrobe',
    description:
      'Add photos of your clothes. Our AI automatically classifies each piece by type, color, and style.',
  },
  {
    id: '3',
    icon: '✨',
    title: 'Generate Outfits',
    description:
      'Tell us the occasion and the vibe. Get tailored outfit suggestions built from your actual wardrobe.',
  },
  {
    id: '4',
    icon: '🎯',
    title: 'Fill the Gaps',
    description:
      'Discover what your wardrobe is missing and get smart recommendations for high-value additions.',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleGetStarted();
    }
  }

  async function handleGetStarted() {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(auth)/sign-in');
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View className="flex-1 bg-black">
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-8">
            <Text style={{ fontSize: 72 }} className="mb-8">{item.icon}</Text>
            <Text className="text-white text-3xl font-bold text-center mb-4">{item.title}</Text>
            <Text className="text-gray-400 text-base text-center leading-relaxed">
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Dots */}
      <View className="flex-row justify-center mb-8 gap-2">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === activeIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIndex ? '#ffffff' : '#374151',
            }}
          />
        ))}
      </View>

      {/* Buttons */}
      <View className="px-6 pb-12 gap-3">
        <TouchableOpacity
          onPress={handleNext}
          className="bg-white rounded-xl py-4"
        >
          <Text className="text-black text-center font-semibold text-base">
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={handleGetStarted}>
            <Text className="text-gray-500 text-center text-sm">Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
