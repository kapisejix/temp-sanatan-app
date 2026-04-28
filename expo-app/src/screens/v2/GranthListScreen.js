import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';
import useApiData from '../../hooks/useApiData';

const FALLBACK = [
  { _id: 'gita', title_hi: 'श्रीमद्भगवद्गीता', title_en: 'Bhagavad Gita', description_hi: 'भगवान कृष्ण द्वारा अर्जुन को दिया गया दिव्य उपदेश', total_chapters: 18 },
  { _id: 'ramayana', title_hi: 'श्रीरामचरितमानस', title_en: 'Ramcharitmanas', description_hi: 'गोस्वामी तुलसीदास रचित श्री राम चरित्र', total_chapters: 7 },
  { _id: 'mahabharata', title_hi: 'महाभारत', title_en: 'Mahabharata', description_hi: 'व्यास द्वारा रचित महाकाव्य', total_chapters: 18 },
];

export default function GranthListScreen({ navigation }) {
  const { data, loading } = useApiData(api.listGranthBooks, FALLBACK, []);
  const books = Array.isArray(data) ? data : FALLBACK;

  return (
    <SafeScreen>
      <ScreenHeader title="ग्रंथ" subtitle="गीता · रामायण · महाभारत" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>हिन्दू धर्म के प्रमुख ग्रंथ — अध्याय और श्लोक के साथ।</Text>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />}
        {books.map(b => (
          <TouchableOpacity
            key={b._id || b.id}
            style={styles.card}
            onPress={() => navigation.navigate('GranthChapters', { book: b })}
            testID={`granth-${b.slug || b._id}`}
          >
            <Text style={styles.emoji}>📖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{b.title_hi}</Text>
              <Text style={styles.cardEn}>{b.title_en}</Text>
              {!!b.description_hi && <Text style={styles.cardDesc} numberOfLines={2}>{b.description_hi}</Text>}
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>📖 {b.total_chapters || '—'} अध्याय</Text>
                {!!b.total_verses && <Text style={styles.metaPill}>📜 {b.total_verses} श्लोक</Text>}
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14 },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12, alignItems: 'center' },
  emoji: { fontSize: 36 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardEn: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  cardDesc: { fontSize: 12, color: COLORS.text, marginTop: 4, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaPill: { fontSize: 10, backgroundColor: '#FEF0EC', color: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '700', overflow: 'hidden' },
  chevron: { fontSize: 26, color: COLORS.textMuted },
});
