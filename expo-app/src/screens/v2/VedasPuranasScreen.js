import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';
import useApiData from '../../hooks/useApiData';

const VEDA_FALLBACK = [
  { _id: 'rig', title_hi: 'ऋग्वेद', title_en: 'Rig Veda', description_hi: 'सबसे प्राचीन वेद — ज्ञान का वेद', total_chapters: 10 },
  { _id: 'sama', title_hi: 'सामवेद', title_en: 'Sama Veda', description_hi: 'गायन और संगीत का वेद', total_chapters: 8 },
  { _id: 'yajur', title_hi: 'यजुर्वेद', title_en: 'Yajur Veda', description_hi: 'यज्ञ कर्मकांड का वेद', total_chapters: 40 },
  { _id: 'atharva', title_hi: 'अथर्ववेद', title_en: 'Atharva Veda', description_hi: 'जीवन और चिकित्सा का वेद', total_chapters: 20 },
];

const PURANAS = [
  { id: 'vishnu', title_hi: 'विष्णु पुराण', status: 'available' },
  { id: 'shiv', title_hi: 'शिव पुराण', status: 'available' },
  { id: 'bhagwat', title_hi: 'भागवत पुराण', status: 'available' },
  { id: 'garuda', title_hi: 'गरुड़ पुराण', status: 'soon' },
  { id: 'narada', title_hi: 'नारद पुराण', status: 'soon' },
  { id: 'agni', title_hi: 'अग्नि पुराण', status: 'soon' },
];

export default function VedasPuranasScreen({ navigation }) {
  const { data, loading } = useApiData(api.listVedaBooks, VEDA_FALLBACK, []);
  const vedas = Array.isArray(data) ? data.filter(v => (v.category || 'veda') === 'veda') : VEDA_FALLBACK;

  return (
    <SafeScreen>
      <ScreenHeader title="वेद और पुराण" subtitle="4 वेद · पुराण" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Vedas */}
        <Text style={styles.sectionLabel}>🕉️ चार वेद</Text>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />}
        {vedas.map(v => (
          <TouchableOpacity
            key={v._id || v.id}
            style={styles.vedaCard}
            onPress={() => navigation.navigate('VedaSuktas', { veda: v })}
            testID={`veda-${v.sub_type || v._id}`}
          >
            <Text style={styles.vedaEmoji}>📜</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.vedaTitle}>{v.title_hi}</Text>
              <Text style={styles.vedaEn}>{v.title_en}</Text>
              {!!v.description_hi && <Text style={styles.vedaDesc} numberOfLines={1}>{v.description_hi}</Text>}
              <Text style={styles.vedaMeta}>{v.total_chapters || '—'} सूक्त/अध्याय</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Puranas */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>📿 पुराण</Text>
        <View style={styles.puranaGrid}>
          {PURANAS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.puranaCard, p.status === 'soon' && styles.puranaSoon]}
              disabled={p.status === 'soon'}
              onPress={() => navigation.navigate('PuranaDetail', { purana: p })}
              testID={`purana-${p.id}`}
            >
              <Text style={styles.puranaEmoji}>{p.status === 'soon' ? '🔒' : '📖'}</Text>
              <Text style={[styles.puranaTitle, p.status === 'soon' && { color: COLORS.textMuted }]}>{p.title_hi}</Text>
              {p.status === 'soon' && <Text style={styles.soonTag}>Coming Soon</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 10, letterSpacing: 0.3 },
  vedaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  vedaEmoji: { fontSize: 32 },
  vedaTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vedaEn: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  vedaDesc: { fontSize: 12, color: COLORS.text, marginTop: 4 },
  vedaMeta: { fontSize: 10, color: COLORS.primary, marginTop: 4, fontWeight: '700' },
  chevron: { fontSize: 22, color: COLORS.textMuted },
  puranaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  puranaCard: { width: '31%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  puranaSoon: { backgroundColor: '#F8F3F1', opacity: 0.7 },
  puranaEmoji: { fontSize: 28 },
  puranaTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 6, textAlign: 'center' },
  soonTag: { fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },
});
