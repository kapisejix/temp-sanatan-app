import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';
import useApiData from '../../hooks/useApiData';

export default function VedaSuktasScreen({ navigation, route }) {
  const veda = route.params?.veda || {};
  const vedaId = veda._id || veda.id;

  const { data, loading } = useApiData(
    () => api.getVedaHierarchy(vedaId),
    null,
    [vedaId]
  );

  const chapters = data?.chapters?.length > 0
    ? data.chapters
    : Array.from({ length: veda.total_chapters || 10 }, (_, i) => ({
        id: `placeholder-${i + 1}`,
        chapter_num: i + 1,
        title_hi: `सूक्त ${i + 1}`,
        verse_count: 0,
        placeholder: true,
      }));

  return (
    <SafeScreen>
      <ScreenHeader title={veda.title_hi || 'वेद'} subtitle={`${chapters.length} सूक्त`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator color={COLORS.primary} />}
        {chapters.map(ch => (
          <TouchableOpacity
            key={ch.id || ch.chapter_num}
            style={styles.row}
            onPress={() => navigation.navigate('GranthVerses', { chapter: { ...ch, placeholder: ch.placeholder }, book: veda })}
            testID={`sukta-${ch.chapter_num}`}
          >
            <View style={styles.numBox}><Text style={styles.numText}>{ch.chapter_num}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{ch.title_hi || `सूक्त ${ch.chapter_num}`}</Text>
              <Text style={styles.meta}>{ch.verse_count > 0 ? `${ch.verse_count} मंत्र` : 'जल्द ही उपलब्ध'}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  numBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF0EC', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  numText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: COLORS.textMuted },
});
