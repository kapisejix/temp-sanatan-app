// ==============================================================
// Content Detail Screen - Verses with Beginner/Expert mode
// ==============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../store/authStore';
import { COLORS } from '../config/api';
import AudioPlayer from '../components/AudioPlayer';

export default function ContentDetailScreen({ route }) {
  const { id } = route.params;
  const [item, setItem] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('beginner'); // beginner | expert
  const [expandedVerse, setExpandedVerse] = useState(null);
  const [meanings, setMeanings] = useState({});
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [itemRes, versesRes] = await Promise.all([
          api.get(`/content/items/${id}`),
          api.get(`/content/items/${id}/verses`),
        ]);
        setItem(itemRes.data);
        setVerses(versesRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const loadMeaning = async (verseId) => {
    if (expandedVerse === verseId) { setExpandedVerse(null); return; }
    setExpandedVerse(verseId);
    if (!meanings[verseId]) {
      try {
        const { data } = await api.get(`/content/verses/${verseId}/meanings`);
        setMeanings(prev => ({ ...prev, [verseId]: data }));
      } catch (err) { console.error(err); }
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titleHi}>{item?.title_hi}</Text>
        <Text style={styles.titleEn}>{item?.title_en}</Text>
        <Text style={styles.deity}>{item?.deity_hi || item?.deity}</Text>
      </View>

      {/* Mode Toggle */}
      {item?.has_beginner_mode && (
        <View style={styles.modeToggle}>
          {['beginner', 'expert', 'listen'].map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => {
                setMode(m);
                if (m === 'listen') setShowAudioPlayer(true);
                else setShowAudioPlayer(false);
              }}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'listen' ? 'Listen' : m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Audio Player (Listen mode) */}
      {showAudioPlayer && (
        <View style={{ flex: 1, minHeight: 400 }}>
          <AudioPlayer
            itemId={id}
            verses={verses}
            api={api}
            onVersePress={(verse) => loadMeaning(verse._id)}
          />
        </View>
      )}

      {/* Verses (Read mode) */}
      {!showAudioPlayer && verses.map((verse) => (
        <TouchableOpacity
          key={verse._id}
          style={styles.verseCard}
          onPress={() => mode === 'beginner' && loadMeaning(verse._id)}
          activeOpacity={mode === 'expert' ? 1 : 0.7}
        >
          {/* Verse Type Badge */}
          <View style={styles.verseHeader}>
            <View style={styles.verseBadge}>
              <Text style={styles.verseBadgeText}>{verse.verse_type} {verse.verse_num}</Text>
            </View>
          </View>

          {/* Sanskrit Text */}
          <Text style={[styles.sanskritText, mode === 'beginner' && { fontSize: 18 }]}>
            {verse.sanskrit_text}
          </Text>

          {/* Transliteration (Beginner mode always, Expert toggle) */}
          {(mode === 'beginner' || expandedVerse === verse._id) && verse.transliteration && (
            <Text style={styles.transliteration}>{verse.transliteration}</Text>
          )}

          {/* Meanings (Beginner - expanded) */}
          {mode === 'beginner' && expandedVerse === verse._id && (
            <View style={styles.meaningSection}>
              {(meanings[verse._id] || []).map((m, i) => (
                <View key={i} style={styles.meaningCard}>
                  <Text style={styles.meaningLang}>{m.language === 'hi' ? 'Hindi' : m.language === 'en' ? 'English' : m.language}</Text>
                  <Text style={styles.meaningText}>{m.meaning}</Text>
                  {m.word_breakdown?.length > 0 && (
                    <View style={styles.wordBreakdown}>
                      {m.word_breakdown.map((w, j) => (
                        <View key={j} style={styles.wordChip}>
                          <Text style={styles.wordChipText}>{w.word} = {w.meaning_en || w.meaning_hi}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {(meanings[verse._id] || []).length === 0 && (
                <Text style={styles.noMeaning}>Tap to load meaning</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Save to Routine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: COLORS.primary, padding: 24, paddingTop: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  titleHi: { fontSize: 24, fontWeight: '700', color: '#fff' },
  titleEn: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  deity: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
  modeToggle: {
    flexDirection: 'row', margin: 16, backgroundColor: COLORS.surface,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  verseCard: {
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 12,
    padding: 18, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  verseHeader: { flexDirection: 'row', marginBottom: 10 },
  verseBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  verseBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },
  sanskritText: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 26 },
  transliteration: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 10, lineHeight: 20 },
  meaningSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  meaningCard: { backgroundColor: COLORS.accent, padding: 14, borderRadius: 10, marginBottom: 8 },
  meaningLang: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  meaningText: { fontSize: 14, color: COLORS.text, lineHeight: 22, marginTop: 6 },
  wordBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  wordChip: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  wordChipText: { fontSize: 11, color: COLORS.primary },
  noMeaning: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  actionBar: {
    flexDirection: 'row', gap: 10, margin: 16,
  },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
