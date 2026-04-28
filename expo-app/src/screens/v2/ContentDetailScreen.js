import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../../config/api';
import { DEITY_CONTENT, DAILY_BHAKTI } from '../../data/mockData';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';

// Find content by id across deities and daily mantras
function findContent(contentId) {
  for (const d of Object.values(DEITY_CONTENT)) {
    const item = d.items.find(i => i.id === contentId);
    if (item) return item;
  }
  // Fallback to daily bhakti — minimal text
  const all = [...DAILY_BHAKTI.morning, ...DAILY_BHAKTI.evening];
  const item = all.find(i => i.id === contentId);
  if (item) return { ...item, type_hi: 'दैनिक', text_hi: `${item.title_hi}\n\n(पूर्ण पाठ admin database से जल्द ही)` };
  return null;
}

export default function ContentDetailScreen({ navigation, route }) {
  const { contentId } = route.params || {};
  const item = findContent(contentId);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioErr, setAudioErr] = useState('');
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  if (!item) {
    return (
      <SafeScreen>
        <ScreenHeader title="त्रुटि" onBack={() => navigation.goBack()} />
        <View style={{ padding: 20 }}><Text>सामग्री नहीं मिली</Text></View>
      </SafeScreen>
    );
  }

  const handlePlay = async () => {
    try {
      setAudioErr('');
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
      // Try real TTS via backend
      try {
        const tts = await api.ttsSynthesize(item.text_hi.slice(0, 3500), 'hi');
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mpeg;base64,${tts.audio_base64}` },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(s => {
          if (s.didJustFinish) setPlaying(false);
        });
        setPlaying(true);
      } catch (e) {
        setAudioErr('ऑडियो उत्पन्न नहीं हो सका — Integration Hub में Google Cloud TTS कॉन्फ़िगर करें');
      }
    } catch (e) {
      setAudioErr('प्लेबैक त्रुटि');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen>
      <ScreenHeader title={item.title_hi} subtitle={item.title_en || item.type_hi} onBack={() => navigation.goBack()} />
      <View style={styles.audioBar}>
        <TouchableOpacity
          style={[styles.playBtn, playing && styles.playBtnActive]}
          onPress={handlePlay}
          disabled={loading}
          testID="content-play-btn"
        >
          <Text style={styles.playBtnText}>{loading ? '⏳ लोड…' : (playing ? '⏸ रोकें' : '▶ ऑडियो सुनें')}</Text>
        </TouchableOpacity>
        {!!item.duration && <Text style={styles.durationText}>{item.duration}</Text>}
      </View>
      {!!audioErr && (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{audioErr}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.textContent} showsVerticalScrollIndicator={true}>
        <Text style={styles.bodyText}>{item.text_hi}</Text>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  audioBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF0EC', borderBottomWidth: 1, borderBottomColor: '#FDDDD4', paddingHorizontal: 16, paddingVertical: 12 },
  playBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  playBtnActive: { backgroundColor: '#D04E2C' },
  playBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  durationText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  errBox: { backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 8 },
  errText: { fontSize: 11, color: '#991B1B' },
  textContent: { padding: 20, paddingBottom: 80 },
  bodyText: { fontSize: 17, color: COLORS.text, lineHeight: 30, fontWeight: '500' },
});
