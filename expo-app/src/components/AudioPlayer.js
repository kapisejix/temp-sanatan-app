// ==============================================================
// Audio Player with Verse Highlighting (Karaoke-style)
// Uses expo-av for audio playback
// ==============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Animated
} from 'react-native';
import { COLORS } from '../config/api';
// import { Audio } from 'expo-av';  // Uncomment in Expo project

export default function AudioPlayer({ itemId, verses = [], onVersePress, api }) {
  const [audioVerses, setAudioVerses] = useState([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [mode, setMode] = useState('sequential'); // sequential | single
  const scrollRef = useRef(null);
  // const soundRef = useRef(null);  // Uncomment in Expo
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for currently playing verse
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  // Load verse audio data
  useEffect(() => {
    if (!itemId || !api) return;
    const fetchAudio = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/content/items/${itemId}/verses-with-audio`);
        setAudioVerses(data);
      } catch (err) {
        console.error('Failed to load audio data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudio();
  }, [itemId, api]);

  // Auto-scroll to current verse
  useEffect(() => {
    if (currentVerseIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: currentVerseIndex * 120, animated: true });
    }
  }, [currentVerseIndex]);

  // Play a single verse audio
  const playVerse = useCallback(async (index) => {
    const verse = audioVerses[index];
    if (!verse?.has_audio || !api) return;

    setLoadingAudio(true);
    setCurrentVerseIndex(index);

    try {
      // Fetch audio for this verse
      const { data } = await api.get(`/content/verses/${verse._id}/audio`);

      if (data.audio_base64) {
        // In Expo, you would use:
        // if (soundRef.current) { await soundRef.current.unloadAsync(); }
        // const { sound } = await Audio.Sound.createAsync(
        //   { uri: `data:audio/mp3;base64,${data.audio_base64}` },
        //   { shouldPlay: true },
        //   onPlaybackStatusUpdate
        // );
        // soundRef.current = sound;

        setIsPlaying(true);
        setLoadingAudio(false);

        // Simulate playback duration (replace with real expo-av callback)
        const estimatedDuration = data.duration_ms || (verse.sanskrit_text?.length * 80) || 5000;
        setTimeout(() => {
          setIsPlaying(false);
          // Auto-advance in sequential mode
          if (mode === 'sequential' && index < audioVerses.length - 1) {
            playVerse(index + 1);
          } else {
            setCurrentVerseIndex(-1);
          }
        }, estimatedDuration);
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
      setLoadingAudio(false);
    }
  }, [audioVerses, api, mode]);

  /* 
  // Real expo-av playback status callback
  const onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
      if (mode === 'sequential' && currentVerseIndex < audioVerses.length - 1) {
        playVerse(currentVerseIndex + 1);
      } else {
        setCurrentVerseIndex(-1);
      }
    }
  };
  */

  const playAll = () => {
    setMode('sequential');
    playVerse(0);
  };

  const stopPlayback = async () => {
    // if (soundRef.current) { await soundRef.current.stopAsync(); }
    setIsPlaying(false);
    setCurrentVerseIndex(-1);
  };

  const hasAnyAudio = audioVerses.some(v => v.has_audio);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading audio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Player Controls */}
      <View style={styles.controlBar}>
        <View style={styles.controlLeft}>
          {isPlaying ? (
            <TouchableOpacity style={styles.stopBtn} onPress={stopPlayback}>
              <Text style={styles.stopBtnText}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.playAllBtn, !hasAnyAudio && styles.btnDisabled]}
              onPress={playAll}
              disabled={!hasAnyAudio}
            >
              <Text style={styles.playAllBtnText}>Play All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controlRight}>
          {isPlaying && (
            <View style={styles.nowPlaying}>
              <View style={styles.nowPlayingDot} />
              <Text style={styles.nowPlayingText}>
                Verse {currentVerseIndex + 1}/{audioVerses.length}
              </Text>
            </View>
          )}
        </View>

        {/* Mode Toggle */}
        <TouchableOpacity
          style={styles.modeBtn}
          onPress={() => setMode(mode === 'sequential' ? 'single' : 'sequential')}
        >
          <Text style={styles.modeBtnText}>
            {mode === 'sequential' ? 'Auto' : 'Single'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Verse List with Highlighting */}
      <ScrollView ref={scrollRef} style={styles.verseList} showsVerticalScrollIndicator={false}>
        {audioVerses.map((verse, index) => {
          const isCurrent = currentVerseIndex === index;
          const isPlayed = currentVerseIndex > index;

          return (
            <Animated.View
              key={verse._id}
              style={[
                styles.verseRow,
                isCurrent && styles.verseRowActive,
                isPlayed && styles.verseRowPlayed,
                isCurrent && { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                style={styles.verseContent}
                onPress={() => {
                  if (verse.has_audio) {
                    setMode('single');
                    playVerse(index);
                  }
                  onVersePress?.(verse);
                }}
                activeOpacity={0.7}
              >
                {/* Verse Number */}
                <View style={[styles.verseNum, isCurrent && styles.verseNumActive]}>
                  {isCurrent && isPlaying ? (
                    <View style={styles.equalizerContainer}>
                      <View style={[styles.eqBar, styles.eqBar1]} />
                      <View style={[styles.eqBar, styles.eqBar2]} />
                      <View style={[styles.eqBar, styles.eqBar3]} />
                    </View>
                  ) : (
                    <Text style={[styles.verseNumText, isCurrent && styles.verseNumTextActive]}>
                      {verse.verse_num}
                    </Text>
                  )}
                </View>

                {/* Verse Text */}
                <View style={styles.verseTextContainer}>
                  <Text style={[
                    styles.sanskritText,
                    isCurrent && styles.sanskritTextActive,
                    isPlayed && styles.sanskritTextPlayed,
                  ]}>
                    {verse.sanskrit_text}
                  </Text>

                  {verse.transliteration && (
                    <Text style={[styles.transliteration, isCurrent && styles.transliterationActive]}>
                      {verse.transliteration}
                    </Text>
                  )}

                  {/* Audio status indicator */}
                  <View style={styles.audioStatus}>
                    {verse.has_audio ? (
                      <Text style={styles.audioReady}>Audio Ready</Text>
                    ) : (
                      <Text style={styles.audioMissing}>No Audio</Text>
                    )}
                    {verse.verse_type && (
                      <Text style={styles.verseType}>{verse.verse_type}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Loading overlay */}
      {loadingAudio && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingOverlayText}>Loading audio...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, justifyContent: 'center' },
  loadingText: { fontSize: 13, color: COLORS.textSecondary },

  // Controls
  controlBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  controlLeft: { flexDirection: 'row', gap: 8 },
  controlRight: { flex: 1, marginLeft: 12 },
  playAllBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  playAllBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stopBtn: { backgroundColor: '#991B1B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  modeBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  nowPlaying: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nowPlayingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  nowPlayingText: { fontSize: 12, color: COLORS.textSecondary },

  // Verse List
  verseList: { flex: 1 },
  verseRow: {
    marginHorizontal: 12, marginVertical: 4, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  verseRowActive: {
    backgroundColor: '#FFF7ED', borderColor: COLORS.primary, borderWidth: 2,
    shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  verseRowPlayed: { opacity: 0.6 },
  verseContent: { flexDirection: 'row', padding: 14, gap: 12 },

  // Verse Number
  verseNum: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  verseNumActive: { backgroundColor: COLORS.primary },
  verseNumText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  verseNumTextActive: { color: '#fff' },

  // Equalizer animation (playing indicator)
  equalizerContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 },
  eqBar: { width: 3, backgroundColor: '#fff', borderRadius: 1 },
  eqBar1: { height: 8 },
  eqBar2: { height: 14 },
  eqBar3: { height: 10 },

  // Text
  verseTextContainer: { flex: 1 },
  sanskritText: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 24 },
  sanskritTextActive: { color: COLORS.primary, fontSize: 16 },
  sanskritTextPlayed: { color: COLORS.textMuted },
  transliteration: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 6, lineHeight: 18 },
  transliterationActive: { color: '#9A3412' },
  audioStatus: { flexDirection: 'row', gap: 8, marginTop: 6 },
  audioReady: { fontSize: 10, color: '#166534', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  audioMissing: { fontSize: 10, color: '#991B1B', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verseType: { fontSize: 10, color: COLORS.textMuted, backgroundColor: '#F5F5F4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'capitalize' },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  loadingOverlayText: { fontSize: 13, color: COLORS.textSecondary },
});
