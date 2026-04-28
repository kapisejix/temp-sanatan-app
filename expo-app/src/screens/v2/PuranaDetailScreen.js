import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';

const PURANA_INTROS = {
  vishnu: 'विष्णु पुराण — भगवान विष्णु की महिमा, सृष्टि की रचना, युगों का वर्णन और भगवान के अवतारों की कथाएँ। 18 महापुराणों में से एक।',
  shiv: 'शिव पुराण — भगवान शिव की लीलाओं, ज्योतिर्लिंगों, रुद्र महिमा और शिव-पार्वती विवाह कथा का वर्णन। 24,000 श्लोकों में।',
  bhagwat: 'भागवत पुराण — श्रीकृष्ण की लीलाओं का सम्पूर्ण विवरण, 12 स्कंध, 18,000 श्लोक। मोक्षदायी ग्रंथ।',
};

export default function PuranaDetailScreen({ navigation, route }) {
  const p = route.params?.purana || {};
  return (
    <SafeScreen>
      <ScreenHeader title={p.title_hi || 'पुराण'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>📖</Text>
        <Text style={styles.title}>{p.title_hi}</Text>
        <View style={styles.intro}>
          <Text style={styles.introText}>{PURANA_INTROS[p.id] || 'पुराण सामग्री admin database से जल्द ही जोड़ी जाएगी।'}</Text>
        </View>
        <View style={styles.comingBox}>
          <Text style={styles.comingTitle}>📚 अध्याय जल्द ही उपलब्ध</Text>
          <Text style={styles.comingText}>
            पूर्ण पाठ admin panel से upload होते ही यहाँ अध्याय-वार दिखाई देगा।
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, alignItems: 'center' },
  emoji: { fontSize: 60, marginVertical: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  intro: { backgroundColor: '#FEF0EC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FDDDD4', marginBottom: 18 },
  introText: { fontSize: 14, color: COLORS.text, lineHeight: 22, textAlign: 'center' },
  comingBox: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  comingTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  comingText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
});
