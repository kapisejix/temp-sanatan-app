import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';

export default function KathaDetailScreen({ navigation, route }) {
  const k = route.params?.katha;
  const [mode, setMode] = useState('read'); // read | listen
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioErr, setAudioErr] = useState('');
  const soundRef = useRef(null);

  useEffect(() => () => { soundRef.current?.unloadAsync().catch(() => {}); }, []);

  if (!k) return null;

  const handlePlay = async () => {
    setAudioErr('');
    try {
      if (soundRef.current) {
        const s = await soundRef.current.getStatusAsync();
        if (s.isLoaded) {
          if (s.isPlaying) { await soundRef.current.pauseAsync(); setPlaying(false); }
          else { await soundRef.current.playAsync(); setPlaying(true); }
          return;
        }
      }
      setLoading(true);
      const tts = await api.ttsSynthesize(k.full_text.slice(0, 3500), 'hi');
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${tts.audio_base64}` }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) setPlaying(false); });
      setPlaying(true);
    } catch (e) {
      setAudioErr('ऑडियो उत्पन्न नहीं हो सका');
    } finally { setLoading(false); }
  };

  return (
    <SafeScreen>
      <ScreenHeader title={k.title_hi} subtitle={k.title_en} onBack={() => navigation.goBack()} />

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'read' && styles.toggleActive]}
          onPress={() => setMode('read')}
          testID="katha-mode-read"
        >
          <Text style={[styles.toggleText, mode === 'read' && styles.toggleTextActive]}>📖 पढ़ें</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'listen' && styles.toggleActive]}
          onPress={() => setMode('listen')}
          testID="katha-mode-listen"
        >
          <Text style={[styles.toggleText, mode === 'listen' && styles.toggleTextActive]}>🎧 सुनें</Text>
        </TouchableOpacity>
      </View>

      {mode === 'listen' && (
        <View style={styles.audioBar}>
          <TouchableOpacity style={styles.playBtn} onPress={handlePlay} disabled={loading} testID="katha-play-btn">
            <Text style={styles.playBtnText}>{loading ? '⏳ लोड…' : (playing ? '⏸ रोकें' : '▶ कथा सुनें')}</Text>
          </TouchableOpacity>
          <Text style={styles.audioMeta}>⏱ {k.duration}</Text>
        </View>
      )}
      {!!audioErr && (
        <View style={styles.errBox}><Text style={styles.errText}>{audioErr}</Text></View>
      )}

      <ScrollView contentContainerStyle={styles.textContent}>
        <Text style={styles.descBox}>{k.description_hi}</Text>
        <Text style={styles.body}>{k.full_text}</Text>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, padding: 8, gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: COLORS.background },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  toggleTextActive: { color: '#FFF' },
  audioBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF0EC', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FDDDD4' },
  playBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  playBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  audioMeta: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  errBox: { backgroundColor: '#FEE2E2', padding: 8 },
  errText: { fontSize: 11, color: '#991B1B' },
  textContent: { padding: 20, paddingBottom: 80 },
  descBox: { fontSize: 13, color: COLORS.text, fontStyle: 'italic', backgroundColor: '#FEF8F5', padding: 12, borderRadius: 8, marginBottom: 16, lineHeight: 20 },
  body: { fontSize: 16, color: COLORS.text, lineHeight: 28, fontWeight: '500' },
});
