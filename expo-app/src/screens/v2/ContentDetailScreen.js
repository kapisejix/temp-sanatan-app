import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS, API_BASE_URL } from '../../config/api';
import { DEITY_CONTENT, DAILY_BHAKTI } from '../../data/mockData';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';

// ---- Helpers ----
function findContent(contentId) {
  for (const d of Object.values(DEITY_CONTENT)) {
    const item = d.items.find(i => i.id === contentId);
    if (item) return item;
  }
  const all = [...DAILY_BHAKTI.morning, ...DAILY_BHAKTI.evening];
  const item = all.find(i => i.id === contentId);
  if (item) return { ...item, type_hi: 'दैनिक', text_hi: `${item.title_hi}\n\n(पूर्ण पाठ admin database से जल्द ही)` };
  return null;
}

// Mock-content id -> backend item_id map. For real-content items the contentId
// itself is a Mongo ObjectId; for the mock DEITY_CONTENT ids we need to look up.
const MOCK_TO_BACKEND_ID = {
  // Hanuman Chalisa is seeded in DB at this id
  'hanuman-chalisa': '69f053c8053b601fc045a5ca',
};

function resolveBackendId(contentId) {
  if (!contentId) return null;
  if (MOCK_TO_BACKEND_ID[contentId]) return MOCK_TO_BACKEND_ID[contentId];
  // 24-char hex looks like a Mongo ObjectId
  if (/^[a-f0-9]{24}$/i.test(contentId)) return contentId;
  return null;
}

export default function ContentDetailScreen({ navigation, route }) {
  const { contentId } = route.params || {};
  const item = findContent(contentId);
  const backendId = resolveBackendId(contentId);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioErr, setAudioErr] = useState('');

  const [audioMeta, setAudioMeta] = useState(null);     // { audio_url, sync_map, variants, ... }
  const [activeVerseNum, setActiveVerseNum] = useState(0); // 1-indexed; 0 = none
  const [activeLineIdx, setActiveLineIdx] = useState(-1);  // karaoke line index within active verse
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [beginnerLoopNum, setBeginnerLoopNum] = useState(0); // current verse being looped
  const [selectedVariant, setSelectedVariant] = useState('primary'); // 'primary' or slot number

  const soundRef = useRef(null);
  const beginnerRef = useRef({ active: false, verse: 0, loopCount: 0 });

  // ---- Fetch audio sync metadata ----
  useEffect(() => {
    let cancel = false;
    if (!backendId) return;
    (async () => {
      try {
        const data = await api.getItemAudio(backendId);
        if (!cancel && data?.audio_url) {
          // Resolve relative URL to full URL
          const fullUrl = data.audio_url.startsWith('http')
            ? data.audio_url
            : `${API_BASE_URL.replace(/\/api$/, '')}${data.audio_url}`;
          setAudioMeta({ ...data, audio_url: fullUrl });
        }
      } catch { /* no audio yet, fall back to TTS */ }
    })();
    return () => { cancel = true; };
  }, [backendId]);

  // Reset playback when variant changes
  useEffect(() => {
    (async () => {
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch {}
        soundRef.current = null;
      }
      setPlaying(false);
      setActiveVerseNum(0);
      setActiveLineIdx(-1);
    })();
  }, [selectedVariant]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      beginnerRef.current.active = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // ---- Resolve the URL for the currently selected variant ----
  const activeAudioUrl = useMemo(() => {
    if (!audioMeta) return null;
    if (selectedVariant === 'primary') return audioMeta.audio_url || null;
    const v = (audioMeta.variants || []).find((x) => String(x.slot) === String(selectedVariant));
    if (!v) return audioMeta.audio_url || null;
    return v.url?.startsWith('http') ? v.url : `${API_BASE_URL.replace(/\/api$/, '')}${v.url}`;
  }, [audioMeta, selectedVariant]);

  // ---- Active-verse + active-line highlighter (driven by playback position) ----
  const onPlaybackUpdate = useCallback((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      setPlaying(false);
      setActiveVerseNum(0);
      setActiveLineIdx(-1);
      return;
    }
    if (audioMeta?.sync_map?.length && status.positionMillis != null) {
      const pos = status.positionMillis;
      const cur = audioMeta.sync_map.find(
        (v) => pos >= v.start_ms && (v.end_ms == null || pos < v.end_ms)
      );
      if (cur) {
        if (cur.verse_num !== activeVerseNum) setActiveVerseNum(cur.verse_num);
        // Line-level karaoke: find current line within this verse
        if (Array.isArray(cur.lines) && cur.lines.length) {
          const lineIdx = cur.lines.findIndex(
            (ln) => pos >= ln.start_ms && (ln.end_ms == null || pos < ln.end_ms)
          );
          if (lineIdx !== activeLineIdx) setActiveLineIdx(lineIdx);
        } else if (activeLineIdx !== -1) {
          setActiveLineIdx(-1);
        }
      }
    }
  }, [audioMeta, activeVerseNum, activeLineIdx]);

  // ---- Main play/pause toggle ----
  const handlePlay = async () => {
    try {
      setAudioErr('');
      // Disable beginner mode when manually playing
      beginnerRef.current.active = false;
      setBeginnerMode(false);
      setBeginnerLoopNum(0);

      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setPlaying(true);
          }
          return;
        }
      }
      setLoading(true);

      let sound;
      if (activeAudioUrl) {
        // Real MP3 with sync map (primary or expert variant)
        const result = await Audio.Sound.createAsync(
          { uri: activeAudioUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 200 }
        );
        sound = result.sound;
      } else {
        // Fallback to TTS
        const tts = await api.ttsSynthesize((item.text_hi || '').slice(0, 3500), 'hi');
        const result = await Audio.Sound.createAsync(
          { uri: `data:audio/mpeg;base64,${tts.audio_base64}` },
          { shouldPlay: true }
        );
        sound = result.sound;
      }
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackUpdate);
      setPlaying(true);
    } catch (e) {
      setAudioErr('ऑडियो उत्पन्न नहीं हो सका — Integration Hub में Google Cloud TTS कॉन्फ़िगर करें');
    } finally {
      setLoading(false);
    }
  };

  // ---- Beginner Mode: Guru → pause → Student repeat (3x), then next verse ----
  const stopAllSound = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); } catch {}
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  };

  const playVerseTTS = async (text) => {
    const tts = await api.ttsSynthesize(text, 'hi');
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mpeg;base64,${tts.audio_base64}` },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
          resolve();
        }
      });
    });
  };

  const startBeginnerMode = async () => {
    if (!audioMeta?.sync_map?.length) {
      setAudioErr('Beginner Mode के लिए सिंक्रोनाइज़्ड वर्सेज़ चाहिए (Admin से Audio Sync अपलोड करें)');
      return;
    }
    setAudioErr('');
    await stopAllSound();
    setPlaying(false);
    setBeginnerMode(true);
    beginnerRef.current = { active: true, verse: 0, loopCount: 0 };

    const verses = audioMeta.sync_map;
    for (let i = 0; i < verses.length; i++) {
      if (!beginnerRef.current.active) break;
      const v = verses[i];
      setBeginnerLoopNum(v.verse_num);
      setActiveVerseNum(v.verse_num);

      // Play 3 times: Guru → 1.2s pause → Student (replay) → pause
      for (let loop = 0; loop < 3; loop++) {
        if (!beginnerRef.current.active) break;
        try { await playVerseTTS(v.text); } catch { /* skip on fail */ }
        if (!beginnerRef.current.active) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    if (beginnerRef.current.active) {
      // Finished naturally
      beginnerRef.current.active = false;
      setBeginnerMode(false);
      setBeginnerLoopNum(0);
      setActiveVerseNum(0);
    }
  };

  const stopBeginnerMode = async () => {
    beginnerRef.current.active = false;
    await stopAllSound();
    setBeginnerMode(false);
    setBeginnerLoopNum(0);
    setActiveVerseNum(0);
  };

  // ---- Verse rendering (uses sync_map text if present, else split by lines) ----
  const verses = useMemo(() => {
    if (audioMeta?.sync_map?.length) {
      return audioMeta.sync_map.map((v) => ({
        verse_num: v.verse_num,
        text: v.text,
        lines: Array.isArray(v.lines) ? v.lines : null,
      }));
    }
    if (!item) return [];
    // Fallback: split on blank lines
    const parts = (item.text_hi || '').split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
    return parts.map((text, i) => ({ verse_num: i + 1, text }));
  }, [audioMeta, item]);

  if (!item) {
    return (
      <SafeScreen>
        <ScreenHeader title="त्रुटि" onBack={() => navigation.goBack()} />
        <View style={{ padding: 20 }}><Text>सामग्री नहीं मिली</Text></View>
      </SafeScreen>
    );
  }

  const hasSyncedAudio = !!audioMeta?.audio_url && audioMeta?.sync_map?.length > 0;

  return (
    <SafeScreen>
      <ScreenHeader title={item.title_hi} subtitle={item.title_en || item.type_hi} onBack={() => navigation.goBack()} />

      {/* Audio control bar */}
      <View style={styles.audioBar}>
        <TouchableOpacity
          style={[styles.playBtn, playing && styles.playBtnActive]}
          onPress={handlePlay}
          disabled={loading || beginnerMode}
          testID="content-play-btn"
        >
          <Text style={styles.playBtnText}>
            {loading ? '⏳ लोड…' : (playing ? '⏸ रोकें' : '▶ ऑडियो सुनें')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.beginnerBtn, beginnerMode && styles.beginnerBtnActive]}
          onPress={beginnerMode ? stopBeginnerMode : startBeginnerMode}
          disabled={loading}
          testID="content-beginner-btn"
        >
          <Text style={[styles.beginnerBtnText, beginnerMode && styles.beginnerBtnTextActive]}>
            {beginnerMode ? '⏹ रोकें' : '🎓 शिक्षण मोड'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Variant picker (shown only when Expert Mode variants exist) */}
      {Array.isArray(audioMeta?.variants) && audioMeta.variants.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.variantBar}
          testID="variant-picker"
        >
          <TouchableOpacity
            onPress={() => setSelectedVariant('primary')}
            style={[styles.variantChip, selectedVariant === 'primary' && styles.variantChipActive]}
            testID="variant-chip-primary"
          >
            <Text style={[styles.variantChipText, selectedVariant === 'primary' && styles.variantChipTextActive]}>
              डिफ़ॉल्ट
            </Text>
          </TouchableOpacity>
          {audioMeta.variants.map((v) => (
            <TouchableOpacity
              key={v.slot}
              onPress={() => setSelectedVariant(v.slot)}
              style={[styles.variantChip, String(selectedVariant) === String(v.slot) && styles.variantChipActive]}
              testID={`variant-chip-${v.slot}`}
            >
              <Text style={[styles.variantChipText, String(selectedVariant) === String(v.slot) && styles.variantChipTextActive]}>
                {v.label || `Variant ${v.slot}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status / mode banners */}
      {hasSyncedAudio && (
        <View style={styles.syncedBanner}>
          <Text style={styles.syncedText}>🎵 सिंक्रोनाइज़्ड ऑडियो उपलब्ध · {audioMeta.sync_map.length} पंक्तियाँ</Text>
        </View>
      )}
      {beginnerMode && (
        <View style={styles.beginnerBanner}>
          <ActivityIndicator color="#7B3F61" size="small" />
          <Text style={styles.beginnerBannerText}>
            शिक्षण मोड — पंक्ति {beginnerLoopNum} (गुरु → शिष्य लूप)
          </Text>
        </View>
      )}
      {!!audioErr && (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{audioErr}</Text>
        </View>
      )}

      {/* Verse-highlighted text body */}
      <ScrollView contentContainerStyle={styles.textContent} showsVerticalScrollIndicator={true}>
        {verses.length > 0 ? (
          verses.map((v) => {
            const isActive = activeVerseNum === v.verse_num;
            const hasLines = Array.isArray(v.lines) && v.lines.length > 0;
            return (
              <View
                key={v.verse_num}
                style={[styles.verseBlock, isActive && styles.verseBlockActive]}
                testID={`verse-block-${v.verse_num}`}
              >
                <Text style={[styles.verseNum, isActive && styles.verseNumActive]}>
                  {v.verse_num}
                </Text>
                {hasLines ? (
                  <View style={{ flex: 1 }}>
                    {v.lines.map((ln, i) => {
                      const lineActive = isActive && activeLineIdx === i;
                      return (
                        <Text
                          key={i}
                          testID={`verse-${v.verse_num}-line-${i}`}
                          style={[
                            styles.verseText,
                            isActive && styles.verseTextActive,
                            lineActive && styles.lineActive,
                          ]}
                        >
                          {ln.text}
                        </Text>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.verseText, isActive && styles.verseTextActive]}>
                    {v.text}
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.bodyText}>{item.text_hi}</Text>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF0EC',
    borderBottomWidth: 1,
    borderBottomColor: '#FDDDD4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  playBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, flex: 1 },
  playBtnActive: { backgroundColor: '#D04E2C' },
  playBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14, textAlign: 'center' },

  beginnerBtn: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#7B3F61',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24,
  },
  beginnerBtnActive: { backgroundColor: '#7B3F61' },
  beginnerBtnText: { color: '#7B3F61', fontWeight: '700', fontSize: 13 },
  beginnerBtnTextActive: { color: '#FFF' },

  syncedBanner: { backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 6 },
  syncedText: { fontSize: 11, color: '#065F46', fontWeight: '600' },
  beginnerBanner: {
    backgroundColor: '#F5F3FF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, gap: 10,
  },
  beginnerBannerText: { fontSize: 12, color: '#5B21B6', fontWeight: '600' },

  errBox: { backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 8 },
  errText: { fontSize: 11, color: '#991B1B' },

  textContent: { padding: 16, paddingBottom: 80 },
  bodyText: { fontSize: 17, color: COLORS.text, lineHeight: 30, fontWeight: '500' },

  verseBlock: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  verseBlockActive: {
    backgroundColor: '#FEF0EC',
    borderColor: COLORS.primary,
    borderWidth: 2,
    transform: [{ scale: 1.01 }],
  },
  verseNum: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    width: 28,
    textAlign: 'center',
    marginRight: 8,
  },
  verseNumActive: {
    color: COLORS.primary,
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 28,
    fontWeight: '500',
  },
  verseTextActive: {
    fontWeight: '700',
    color: COLORS.text,
  },
  lineActive: {
    backgroundColor: '#FFF4E6',
    color: '#B45309',
    fontWeight: '800',
  },
  variantBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F4',
    borderBottomWidth: 1,
    borderBottomColor: '#FDDDD4',
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  variantChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  variantChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  variantChipTextActive: { color: '#FFF' },
});
