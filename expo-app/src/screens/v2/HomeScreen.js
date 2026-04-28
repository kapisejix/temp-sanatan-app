import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../../config/api';
import {
  TODAY_UPAYA, CURRENT_DASHA, TODAY_PANCHANG, TRENDING_BHAKTI, QUICK_ACTIONS, SAMPLE_AUDIO_URI,
} from '../../data/mockData';

function Section({ title, children, accent }) {
  return (
    <View style={styles.section}>
      {title && (
        <View style={styles.sectionHeaderRow}>
          {accent && <View style={[styles.sectionAccent, { backgroundColor: accent }]} />}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

function UpayaCard({ onPlay, playing, loading, onWhy }) {
  return (
    <View style={styles.upayaCard}>
      <Text style={styles.upayaLabel}>आज का उपाय</Text>
      <Text style={styles.upayaGraha}>{TODAY_UPAYA.graha_hi}</Text>
      <Text style={styles.upayaDevta}>{TODAY_UPAYA.devta_hi}</Text>
      <View style={styles.mantraBox}>
        <Text style={styles.mantraText}>{TODAY_UPAYA.mantra}</Text>
      </View>
      <View style={styles.upayaMetaRow}>
        <Text style={styles.upayaMeta}>जप संख्या: <Text style={styles.upayaMetaBold}>{TODAY_UPAYA.count}</Text></Text>
        <Text style={styles.upayaMeta}>दिन: <Text style={styles.upayaMetaBold}>{TODAY_UPAYA.day_hi}</Text></Text>
      </View>
      <View style={styles.upayaButtonsRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onPlay} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? '⏳ लोड…' : (playing ? '⏸ रोकें' : '▶ सुनें')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onWhy}>
          <Text style={styles.secondaryBtnText}>क्यों?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DashaCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>वर्तमान दशा प्रभाव</Text>
        <View style={styles.severityBadge}>
          <Text style={styles.severityText}>{CURRENT_DASHA.overall_severity_hi}</Text>
        </View>
      </View>
      <View style={styles.dashaPillsRow}>
        <View style={styles.dashaPill}>
          <Text style={styles.dashaPillLabel}>महादशा</Text>
          <Text style={styles.dashaPillPlanet}>{CURRENT_DASHA.mahadasha.planet_hi}</Text>
          <Text style={styles.dashaPillDates}>{CURRENT_DASHA.mahadasha.start} → {CURRENT_DASHA.mahadasha.end}</Text>
        </View>
        <View style={styles.dashaPill}>
          <Text style={styles.dashaPillLabel}>अंतर्दशा</Text>
          <Text style={styles.dashaPillPlanet}>{CURRENT_DASHA.antardasha.planet_hi}</Text>
          <Text style={styles.dashaPillDates}>{CURRENT_DASHA.antardasha.start} → {CURRENT_DASHA.antardasha.end}</Text>
        </View>
      </View>
      {CURRENT_DASHA.insights_hi.map((ins, i) => (
        <View key={i} style={styles.insightRow}>
          <View style={styles.insightDot} />
          <Text style={styles.insightText}>{ins}</Text>
        </View>
      ))}
    </View>
  );
}

function PanchangCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>आज का पंचांग</Text>
      <Text style={styles.panchangDate}>{TODAY_PANCHANG.date} · {TODAY_PANCHANG.weekday_hi}</Text>
      <View style={styles.panchangGrid}>
        <View style={styles.panchangCell}><Text style={styles.panchangLabel}>तिथि</Text><Text style={styles.panchangValue}>{TODAY_PANCHANG.tithi_hi}</Text></View>
        <View style={styles.panchangCell}><Text style={styles.panchangLabel}>नक्षत्र</Text><Text style={styles.panchangValue}>{TODAY_PANCHANG.nakshatra_hi}</Text></View>
        <View style={styles.panchangCell}><Text style={styles.panchangLabel}>योग</Text><Text style={styles.panchangValue}>{TODAY_PANCHANG.yoga_hi}</Text></View>
        <View style={styles.panchangCell}><Text style={styles.panchangLabel}>राहु काल</Text><Text style={styles.panchangValue}>{TODAY_PANCHANG.rahu_kaal}</Text></View>
      </View>
    </View>
  );
}

function QuickActions({ navigation }) {
  return (
    <View style={styles.quickRow}>
      {QUICK_ACTIONS.map(qa => (
        <TouchableOpacity
          key={qa.id}
          style={styles.quickBtn}
          onPress={() => qa.screen === 'AIChat' ? navigation.navigate('AIChat') : navigation.jumpTo && navigation.jumpTo(qa.screen)}
        >
          <Text style={styles.quickIcon}>{qa.icon}</Text>
          <Text style={styles.quickLabel}>{qa.label_hi}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TrendingList({ onPlayItem }) {
  return TRENDING_BHAKTI.map(item => (
    <TouchableOpacity key={item.id} style={styles.trendingRow} onPress={() => onPlayItem(item)}>
      <View style={styles.trendingPlay}><Text style={styles.trendingPlayIcon}>▶</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.trendingTitle}>{item.title_hi}</Text>
        <Text style={styles.trendingMeta}>{item.deity} · {item.duration} · {item.plays} plays</Text>
      </View>
    </TouchableOpacity>
  ));
}

export default function HomeScreen({ navigation }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [whyModal, setWhyModal] = useState(false);
  const soundRef = useRef(null);

  const togglePlay = async () => {
    try {
      if (soundRef.current && playing) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
        return;
      }
      if (soundRef.current && !playing) {
        await soundRef.current.playAsync();
        setPlaying(true);
        return;
      }
      setLoading(true);
      const { sound } = await Audio.Sound.createAsync({ uri: SAMPLE_AUDIO_URI });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) setPlaying(false); });
      await sound.playAsync();
      setPlaying(true);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.greetRow}>
        <Text style={styles.greet}>नमस्ते 🙏</Text>
        <Text style={styles.greetSub}>आज का आध्यात्मिक मार्गदर्शन</Text>
      </View>

      <UpayaCard onPlay={togglePlay} playing={playing} loading={loading} onWhy={() => setWhyModal(!whyModal)} />
      {whyModal && (
        <View style={styles.whyBox}>
          <Text style={styles.whyText}>{TODAY_UPAYA.why_hi}</Text>
        </View>
      )}

      <DashaCard />
      <PanchangCard />

      <Section title="त्वरित कार्य">
        <QuickActions navigation={navigation} />
      </Section>

      <Section title="ट्रेंडिंग भक्ति">
        <View style={styles.card}>
          <TrendingList onPlayItem={togglePlay} />
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 100 },
  greetRow: { marginBottom: 16 },
  greet: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  greetSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  section: { marginTop: 18 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  severityBadge: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  severityText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  upayaCard: { backgroundColor: '#FEF0EC', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#FDDDD4', marginBottom: 14 },
  upayaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  upayaGraha: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  upayaDevta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  mantraBox: { backgroundColor: '#FFF8F4', borderLeftWidth: 3, borderLeftColor: COLORS.primary, padding: 12, marginVertical: 12, borderRadius: 6 },
  mantraText: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 24 },
  upayaMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  upayaMeta: { fontSize: 12, color: COLORS.textSecondary },
  upayaMetaBold: { fontWeight: '700', color: COLORS.text },
  upayaButtonsRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  secondaryBtn: { backgroundColor: '#FFF', borderColor: '#FDDDD4', borderWidth: 1, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  whyBox: { backgroundColor: '#FFF8F4', borderLeftWidth: 3, borderLeftColor: COLORS.primary, padding: 12, marginBottom: 14, borderRadius: 6 },
  whyText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  dashaPillsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dashaPill: { flex: 1, backgroundColor: '#FEF8F5', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FDDDD4' },
  dashaPillLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  dashaPillPlanet: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  dashaPillDates: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  insightDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginRight: 8, marginTop: 7 },
  insightText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 20 },
  panchangDate: { fontSize: 12, color: COLORS.textSecondary, marginVertical: 6 },
  panchangGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  panchangCell: { width: '50%', paddingVertical: 6 },
  panchangLabel: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase' },
  panchangValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 1 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickIcon: { fontSize: 26 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 6 },
  trendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  trendingPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  trendingPlayIcon: { color: '#FFF', fontSize: 13 },
  trendingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  trendingMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
