import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';
import useApiData from '../../hooks/useApiData';

export default function GranthVersesScreen({ navigation, route }) {
  const chapter = route.params?.chapter || {};
  const book = route.params?.book || {};
  const chapterId = chapter.id;

  const isPlaceholder = !!chapter.placeholder;
  const { data, loading } = useApiData(
    () => api.getGranthChapterVerses(chapterId, 'hi'),
    null,
    [chapterId]
  );

  const verses = data?.verses || [];
  const [playingId, setPlayingId] = useState(null);
  const [audioErr, setAudioErr] = useState('');
  const soundRef = useRef(null);

  useEffect(() => () => { soundRef.current?.unloadAsync().catch(() => {}); }, []);

  const togglePlay = async (verse) => {
    setAudioErr('');
    try {
      if (soundRef.current && playingId === verse._id) {
        const s = await soundRef.current.getStatusAsync();
        if (s.isLoaded && s.isPlaying) { await soundRef.current.pauseAsync(); setPlayingId(null); return; }
      }
      if (soundRef.current) await soundRef.current.unloadAsync();
      const text = verse.text_hi || verse.display_meaning || verse.meaning?.hi || verse.sanskrit || '';
      if (!text) return;
      const tts = await api.ttsSynthesize(text.slice(0, 3500), 'hi');
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${tts.audio_base64}` }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) setPlayingId(null); });
      setPlayingId(verse._id);
    } catch (e) { setAudioErr('ऑडियो त्रुटि — Google Cloud TTS कॉन्फ़िगर करें'); }
  };

  return (
    <SafeScreen>
      <ScreenHeader
        title={chapter.title_hi || `अध्याय ${chapter.chapter_num}`}
        subtitle={book.title_hi}
        onBack={() => navigation.goBack()}
      />
      {!!audioErr && <View style={styles.errBox}><Text style={styles.errText}>{audioErr}</Text></View>}
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 30 }} />}

        {!loading && (isPlaceholder || verses.length === 0) && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>श्लोक जल्द ही उपलब्ध</Text>
            <Text style={styles.emptyText}>
              {book.title_hi || 'इस ग्रंथ'} के अध्याय {chapter.chapter_num} के श्लोक admin database में अभी अपलोड नहीं हुए हैं। Admin Panel → Granth Manager से अपलोड कर सकते हैं।
            </Text>
          </View>
        )}

        {verses.map((v) => {
          const sanskrit = v.sanskrit || v.text || '';
          const hi = v.text_hi || v.display_meaning || v.meaning?.hi || '';
          return (
            <View key={v._id} style={styles.verseCard}>
              <View style={styles.verseHead}>
                <Text style={styles.verseNum}>श्लोक {v.verse_num}</Text>
                <TouchableOpacity onPress={() => togglePlay(v)} style={styles.playMini} testID={`verse-play-${v.verse_num}`}>
                  <Text style={styles.playMiniText}>{playingId === v._id ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
              </View>
              {!!sanskrit && <Text style={styles.sanskrit}>{sanskrit}</Text>}
              {!!hi && (
                <View style={styles.meaningBox}>
                  <Text style={styles.meaningLabel}>हिंदी अर्थ</Text>
                  <Text style={styles.meaningText}>{hi}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  errBox: { backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 6 },
  errText: { fontSize: 11, color: '#991B1B' },
  emptyBox: { alignItems: 'center', padding: 24, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  verseCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  verseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  verseNum: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  playMini: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  playMiniText: { color: '#FFF', fontSize: 12 },
  sanskrit: { fontSize: 16, color: COLORS.text, lineHeight: 26, fontWeight: '600', marginBottom: 8 },
  meaningBox: { backgroundColor: '#FEF8F5', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  meaningLabel: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  meaningText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
