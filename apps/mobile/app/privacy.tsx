import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}>
        <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 24 }}>Last updated: May 2025</Text>

        <Section title="Overview">
          Fitte ("we", "us", "our") is an AI-powered personal styling app. This policy explains what data we collect, how we use it, and your rights.
        </Section>

        <Section title="Data We Collect">
          {`• Account information: email address used to create your account.\n• Style profile: age, city, body type, aesthetic preferences, and budget range — only what you choose to provide.\n• Wardrobe items: photos and metadata (item type, color, fabric, etc.) you upload.\n• Usage data: outfits generated, saved, and feedback (liked/disliked) you provide.\n• Device location: used only to fetch local weather for outfit suggestions. We do not store your location.`}
        </Section>

        <Section title="How We Use Your Data">
          {`• To generate personalised outfit suggestions via Claude AI (Anthropic).\n• To visualise outfits via Fal.ai image generation.\n• To improve suggestions over time using your feedback.\n• We do not sell your data to third parties.`}
        </Section>

        <Section title="Third-Party Services">
          {`• Supabase — database and authentication\n• Anthropic (Claude) — AI outfit generation\n• Fal.ai — outfit visualisation\n• Open-Meteo — weather data (no account required)\n\nEach service has its own privacy policy. We share only the minimum data needed for each function.`}
        </Section>

        <Section title="Data Retention">
          Your wardrobe items and outfits are stored until you delete your account. You can delete individual wardrobe items or saved outfits at any time within the app.
        </Section>

        <Section title="Your Rights">
          {`• Access: request a copy of your data.\n• Deletion: delete your account and all associated data.\n• Correction: update your profile at any time in the app.\n\nTo exercise these rights, contact us at support@fitte.app`}
        </Section>

        <Section title="Children">
          Fitte is not directed at children under 13. We do not knowingly collect data from children.
        </Section>

        <Section title="Changes">
          We may update this policy. Continued use of the app after changes constitutes acceptance.
        </Section>

        <Section title="Contact">
          Questions? Email us at support@fitte.app
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string | React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: '#9ca3af', fontSize: 13, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}
