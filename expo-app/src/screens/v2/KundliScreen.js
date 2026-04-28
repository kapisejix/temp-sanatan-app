import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import { KUNDLI_OVERVIEW, KUNDLI_ANALYSIS, TODAY_UPAYA } from '../../data/mockData';

const TABS = ['Overview', 'Charts', 'Analysis', 'Remedies'];
const TAB_LABELS = { Overview: 'सारांश', Charts: 'चार्ट', Analysis: 'विश्लेषण', Remedies: 'उपाय' };

function ScoreBar({ s }) {
  const colour = s.priority === 'HIGH' ? '#DC2626' : s.priority === 'MEDIUM' ? '#D97706' : '#16A34A';
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreName}>{s.graha_hi}</Text>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${s.score}%`, backgroundColor: colour }]} />
      </View>
      <Text style={styles.scoreVal}>{s.score}</Text>
    </View>
  );
}

function OverviewTab() {
  const k = KUNDLI_OVERVIEW;
  return (
    <View>
      <View style={styles.userCard}>
        <Text style={styles.userName}>{k.user.name}</Text>
        <Text style={styles.userMeta}>{k.user.dob} · {k.user.tob} · {k.user.place}</Text>
        <View style={styles.ascRow}>
          <Text style={styles.ascLabel}>लग्न</Text>
          <Text style={styles.ascValue}>{k.ascendant_hi}</Text>
        </View>
      </View>

      <Text style={styles.tabSection}>ग्रह स्कोर</Text>
      <View style={styles.card}>
        {k.graha_scores.map(s => <ScoreBar key={s.graha} s={s} />)}
      </View>

      <Text style={styles.tabSection}>दोष सारांश</Text>
      <View style={styles.card}>
        {k.doshas.map(d => (
          <View key={d.type} style={styles.doshaRow}>
            <Text style={styles.doshaName}>{d.name_hi}</Text>
            <View style={[styles.doshaBadge, { backgroundColor: d.present ? '#FEE2E2' : '#DCFCE7' }]}>
              <Text style={[styles.doshaBadgeText, { color: d.present ? '#991B1B' : '#166534' }]}>
                {d.severity_hi}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ChartsTab() {
  // Placeholder North-Indian style diamond chart with house grid (text-only).
  const houses = ['1\nलग्न', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  return (
    <View>
      <Text style={styles.tabSection}>लग्न कुंडली (D1)</Text>
      <View style={styles.chartBox}>
        <View style={styles.chartGrid}>
          {houses.map((h, i) => (
            <View key={i} style={styles.chartCell}>
              <Text style={styles.chartCellText}>{h}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.chartHint}>(Web पर पूर्ण SVG चार्ट उपलब्ध)</Text>
      </View>

      <Text style={styles.tabSection}>नवांश कुंडली (D9)</Text>
      <View style={styles.chartBox}>
        <View style={styles.chartGrid}>
          {houses.map((h, i) => (
            <View key={i} style={styles.chartCell}>
              <Text style={styles.chartCellText}>{h}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.chartHint}>(Web पर पूर्ण SVG चार्ट उपलब्ध)</Text>
      </View>
    </View>
  );
}

function AnalysisTab() {
  return (
    <View>
      <Text style={styles.tabSection}>दशा विश्लेषण</Text>
      <View style={styles.card}>
        <Text style={styles.bodyText}>
          वर्तमान महादशा: <Text style={{ fontWeight: '700' }}>शनि (2016-2035)</Text>{'\n'}
          वर्तमान अंतर्दशा: <Text style={{ fontWeight: '700' }}>शुक्र (2023-2026)</Text>
        </Text>
      </View>

      <Text style={styles.tabSection}>3 मुख्य भविष्यवाणियाँ</Text>
      {KUNDLI_ANALYSIS.predictions_hi.map((p, i) => (
        <View key={i} style={[styles.card, { paddingVertical: 12 }]}>
          <Text style={styles.predictionNum}>{i + 1}</Text>
          <Text style={styles.predictionText}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

function RemediesTab() {
  return (
    <View>
      <Text style={styles.tabSection}>आज का मंत्र</Text>
      <View style={[styles.card, { backgroundColor: '#FEF0EC', borderColor: '#FDDDD4' }]}>
        <Text style={styles.remedyGraha}>{TODAY_UPAYA.graha_hi}</Text>
        <Text style={styles.remedyDevta}>{TODAY_UPAYA.devta_hi}</Text>
        <View style={styles.remedyMantraBox}>
          <Text style={styles.remedyMantra}>{TODAY_UPAYA.mantra}</Text>
        </View>
        <Text style={styles.remedyMeta}>जप: {TODAY_UPAYA.count}× · दिन: {TODAY_UPAYA.day_hi}</Text>
        <Text style={styles.remedyText}>{TODAY_UPAYA.remedy_hi}</Text>
        <TouchableOpacity style={styles.playBtn}>
          <Text style={styles.playBtnText}>▶ मंत्र सुनें</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function KundliScreen() {
  const [active, setActive] = useState('Overview');

  return (
    <View style={styles.root}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, active === t && styles.tabItemActive]}
            onPress={() => setActive(t)}
          >
            <Text style={[styles.tabText, active === t && styles.tabTextActive]}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent}>
        {active === 'Overview' && <OverviewTab />}
        {active === 'Charts' && <ChartsTab />}
        {active === 'Analysis' && <AnalysisTab />}
        {active === 'Remedies' && <RemediesTab />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  tabContent: { padding: 16, paddingBottom: 100 },
  tabSection: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  userCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  ascRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  ascLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginRight: 6 },
  ascValue: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  scoreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  scoreName: { width: 50, fontSize: 12, color: COLORS.text, fontWeight: '600' },
  scoreBarBg: { flex: 1, height: 6, backgroundColor: '#F3EDEA', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreVal: { width: 28, textAlign: 'right', fontSize: 11, fontWeight: '700', color: COLORS.text },
  doshaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  doshaName: { fontSize: 13, color: COLORS.text },
  doshaBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  doshaBadgeText: { fontSize: 11, fontWeight: '700' },
  chartBox: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  chartCell: { width: '25%', height: 70, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border },
  chartCellText: { fontSize: 11, color: COLORS.text, textAlign: 'center' },
  chartHint: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  bodyText: { fontSize: 13, color: COLORS.text, lineHeight: 22 },
  predictionNum: { position: 'absolute', top: 10, right: 12, fontSize: 22, fontWeight: '900', color: '#FDDDD4' },
  predictionText: { fontSize: 13, color: COLORS.text, lineHeight: 22, paddingRight: 22 },
  remedyGraha: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  remedyDevta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  remedyMantraBox: { backgroundColor: '#FFF', borderLeftWidth: 3, borderLeftColor: COLORS.primary, padding: 10, marginVertical: 10, borderRadius: 6 },
  remedyMantra: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  remedyMeta: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  remedyText: { fontSize: 12, color: COLORS.text, marginBottom: 12, lineHeight: 18 },
  playBtn: { backgroundColor: COLORS.primary, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  playBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
