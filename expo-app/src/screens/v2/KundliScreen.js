import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../config/api';
import api from '../../api/client';
import SafeScreen from '../../components/SafeScreen';
import NorthIndianChart from '../../components/NorthIndianChart';

const TABS = [
  { id: 'Charts',   label: 'चार्ट' },
  { id: 'Overview', label: 'सारांश' },
  { id: 'Analysis', label: 'विश्लेषण' },
  { id: 'Remedies', label: 'उपाय' },
];

const CHART_TABS = [
  { id: 'd1',  label: 'D1 लग्न', titleHi: 'लग्न कुंडली (D1)' },
  { id: 'd9',  label: 'D9 नवांश', titleHi: 'नवांश कुंडली (D9)' },
  { id: 'd7',  label: 'D7 सप्तमांश', titleHi: 'सप्तमांश कुंडली (D7)' },
  { id: 'd10', label: 'D10 दशमांश', titleHi: 'दशमांश कुंडली (D10)' },
];

const FORM_KEY = '@kundli_form_v1';

// ---------- helpers ----------
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

// ---------- main screen ----------
export default function KundliScreen() {
  const [active, setActive] = useState('Charts');
  const [activeChart, setActiveChart] = useState('d1');

  const [kundli, setKundli] = useState(null);   // full /kundli/my response
  const [charts, setCharts] = useState(null);   // /charts/d1-d9 response (d1, d9, d7, d10)
  const [dasha, setDasha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dob: '', tob: '', birth_place: '' });
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const my = await api.getMyKundli();
      if (my && my.planets) {
        setKundli(my);
        setForm({
          name: my.name || '',
          dob: my.dob || '',
          tob: my.tob || '',
          birth_place: my.birth_place || '',
        });
        try {
          const ch = await api.getCharts();
          setCharts(ch);
        } catch (e) { /* charts endpoint failed; will fall back to my.d9_chart etc. */ }
        try {
          const d = await api.getCurrentDasha();
          setDasha(d);
        } catch { /* dasha optional */ }
      } else {
        setKundli(null);
        // Pre-fill from cached form if any
        const cached = await AsyncStorage.getItem(FORM_KEY);
        if (cached) setForm(JSON.parse(cached));
        setShowForm(true);
      }
    } catch (e) {
      setError('कुंडली लोड नहीं हो सकी। कृपया दोबारा प्रयास करें।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleGenerate = async () => {
    if (!form.name || !form.dob || !form.tob || !form.birth_place) {
      setError('कृपया सभी फ़ील्ड भरें');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await AsyncStorage.setItem(FORM_KEY, JSON.stringify(form));
      const data = await api.generateKundli({
        name: form.name,
        gender: 'other',
        dob: form.dob,
        tob: form.tob,
        birth_place: form.birth_place,
      });
      setKundli(data);
      // Reshape generated response into "charts" shape used by chart picker
      const dummyAsc = data.ascendant ? Math.floor((data.ascendant.degree || 0) / 30) : 0;
      setCharts({
        d1: {
          ascendant: { rashi_idx: dummyAsc },
          planets: (data.planets || []).map(p => ({
            graha: p.graha, rashi_idx: p.rashi_idx, is_retrograde: p.is_retrograde,
            degree_in_sign: typeof p.degree === 'number' ? p.degree - Math.floor(p.degree / 30) * 30 : undefined,
          })),
        },
        d9: data.d9_chart,
        d7: data.d7_chart,
        d10: data.d10_chart,
      });
      setShowForm(false);
    } catch (e) {
      const detail = e.response?.data?.detail || 'कुंडली उत्पन्न नहीं हो सकी';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Render: Form ----------
  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>कुंडली बनाएं</Text>
      <Text style={styles.formSub}>Swiss Ephemeris आधारित सटीक गणना</Text>

      <Text style={styles.label}>नाम</Text>
      <TextInput
        value={form.name}
        onChangeText={(v) => setForm({ ...form, name: v })}
        placeholder="आपका नाम"
        placeholderTextColor="#9AA0A6"
        style={styles.input}
      />

      <Text style={styles.label}>जन्म तिथि (YYYY-MM-DD)</Text>
      <TextInput
        value={form.dob}
        onChangeText={(v) => setForm({ ...form, dob: v })}
        placeholder="1990-01-15"
        placeholderTextColor="#9AA0A6"
        style={styles.input}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      />

      <Text style={styles.label}>जन्म समय (HH:MM, 24h)</Text>
      <TextInput
        value={form.tob}
        onChangeText={(v) => setForm({ ...form, tob: v })}
        placeholder="10:30"
        placeholderTextColor="#9AA0A6"
        style={styles.input}
      />

      <Text style={styles.label}>जन्म स्थान</Text>
      <TextInput
        value={form.birth_place}
        onChangeText={(v) => setForm({ ...form, birth_place: v })}
        placeholder="दिल्ली, भारत"
        placeholderTextColor="#9AA0A6"
        style={styles.input}
      />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
        onPress={handleGenerate}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.primaryBtnText}>{kundli ? 'पुनः गणना करें' : 'कुंडली बनाएं'}</Text>}
      </TouchableOpacity>

      {kundli && (
        <TouchableOpacity style={styles.linkBtn} onPress={() => setShowForm(false)}>
          <Text style={styles.linkBtnText}>← रद्द करें</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ---------- Render: Charts tab ----------
  const renderChartsTab = () => {
    if (!charts && !kundli) return null;
    const c = (charts && charts[activeChart]) || (
      activeChart === 'd1' && kundli ? {
        ascendant: { rashi_idx: kundli.ascendant ? Math.floor(kundli.ascendant.degree / 30) : 0 },
        planets: (kundli.planets || []).map(p => ({
          graha: p.graha, rashi_idx: p.rashi_idx, is_retrograde: p.is_retrograde,
          degree_in_sign: typeof p.degree === 'number' ? p.degree - Math.floor(p.degree / 30) * 30 : undefined,
        })),
      } : (activeChart === 'd9' ? kundli?.d9_chart
        : activeChart === 'd7' ? kundli?.d7_chart
        : kundli?.d10_chart)
    );
    if (!c) return <Text style={styles.dimText}>{`${activeChart.toUpperCase()} चार्ट उपलब्ध नहीं`}</Text>;

    const chartTab = CHART_TABS.find(t => t.id === activeChart);
    return (
      <View>
        <View style={styles.chartTabBar}>
          {CHART_TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.chartTab, activeChart === t.id && styles.chartTabActive]}
              onPress={() => setActiveChart(t.id)}
            >
              <Text style={[styles.chartTabText, activeChart === t.id && styles.chartTabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <NorthIndianChart
          ascendantRashiIdx={c.ascendant?.rashi_idx || 0}
          planets={c.planets || []}
          title={chartTab?.titleHi || 'कुंडली'}
        />

        {/* Planets table for current chart */}
        <Text style={styles.tabSection}>ग्रह स्थिति ({activeChart.toUpperCase()})</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowHeader]}>
            <Text style={[styles.cell, styles.cellGraha, styles.cellHeader]}>ग्रह</Text>
            <Text style={[styles.cell, styles.cellHeader]}>राशि</Text>
            <Text style={[styles.cell, styles.cellNum, styles.cellHeader]}>भाव</Text>
            <Text style={[styles.cell, styles.cellNum, styles.cellHeader]}>अंश</Text>
          </View>
          {(c.planets || []).map((p, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.cell, styles.cellGraha]}>{p.graha_hi || p.graha}</Text>
              <Text style={styles.cell}>{p.rashi_hi || p.rashi || '-'}</Text>
              <Text style={[styles.cell, styles.cellNum]}>{p.house || '-'}</Text>
              <Text style={[styles.cell, styles.cellNum]}>
                {typeof p.degree_in_sign === 'number' ? p.degree_in_sign.toFixed(1) + '°' : '-'}
                {p.is_retrograde ? ' (व)' : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ---------- Render: Overview tab ----------
  const renderOverviewTab = () => {
    if (!kundli) return null;
    const ascHi = kundli.ascendant?.rashi_hi || '—';
    const scores = kundli.graha_scores || [];
    const doshas = [
      { type: 'mangal_dosha', name: 'मंगल दोष', d: kundli.doshas?.mangal_dosha },
      { type: 'kaal_sarp_dosha', name: 'काल सर्प दोष', d: kundli.doshas?.kaal_sarp_dosha },
      { type: 'sade_sati', name: 'साढ़े साती', d: kundli.doshas?.sade_sati },
    ];
    return (
      <View>
        <View style={styles.userCard}>
          <Text style={styles.userName}>{kundli.name}</Text>
          <Text style={styles.userMeta}>{kundli.dob} · {kundli.tob} · {kundli.birth_place}</Text>
          <View style={styles.ascRow}>
            <Text style={styles.ascLabel}>लग्न</Text>
            <Text style={styles.ascValue}>{ascHi}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.editBtnText}>✎ संपादित करें</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tabSection}>ग्रह स्कोर</Text>
        <View style={styles.card}>
          {scores.map(s => <ScoreBar key={s.graha} s={s} />)}
          {!scores.length && <Text style={styles.dimText}>स्कोर उपलब्ध नहीं</Text>}
        </View>

        <Text style={styles.tabSection}>दोष सारांश</Text>
        <View style={styles.card}>
          {doshas.map(({ type, name, d }) => (
            <View key={type} style={styles.doshaRow}>
              <Text style={styles.doshaName}>{name}</Text>
              <View style={[styles.doshaBadge, { backgroundColor: d?.present ? '#FEE2E2' : '#DCFCE7' }]}>
                <Text style={[styles.doshaBadgeText, { color: d?.present ? '#991B1B' : '#166534' }]}>
                  {d?.severity_hi || (d?.present ? 'उपस्थित' : 'नहीं')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ---------- Render: Analysis tab ----------
  const renderAnalysisTab = () => {
    const md = dasha?.current_dasha?.mahadasha || kundli?.current_dasha?.mahadasha;
    const ad = dasha?.current_dasha?.antardasha || kundli?.current_dasha?.antardasha;
    const interp = kundli?.dasha_interpretation || dasha?.interpretation;
    const themes = interp?.themes_hi || [];
    const summary = interp?.summary_hi;
    return (
      <View>
        <Text style={styles.tabSection}>दशा विश्लेषण</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            वर्तमान महादशा: <Text style={{ fontWeight: '700' }}>{md?.planet_hi || '—'}</Text>{'\n'}
            वर्तमान अंतर्दशा: <Text style={{ fontWeight: '700' }}>{ad?.planet_hi || '—'}</Text>
          </Text>
          {summary ? <Text style={[styles.bodyText, { marginTop: 8, fontStyle: 'italic' }]}>{summary}</Text> : null}
        </View>

        {!!themes.length && (
          <>
            <Text style={styles.tabSection}>मुख्य भविष्यवाणियाँ</Text>
            {themes.slice(0, 5).map((p, i) => (
              <View key={i} style={[styles.card, { paddingVertical: 12 }]}>
                <Text style={styles.predictionNum}>{i + 1}</Text>
                <Text style={styles.predictionText}>{p}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  // ---------- Render: Remedies tab ----------
  const renderRemediesTab = () => {
    const top = kundli?.top_recommendations?.[0];
    if (!top) return <Text style={styles.dimText}>कोई उपाय अनुशंसित नहीं</Text>;
    const rec = top.recommendation || {};
    return (
      <View>
        <Text style={styles.tabSection}>आज का मंत्र</Text>
        <View style={[styles.card, { backgroundColor: '#FEF0EC', borderColor: '#FDDDD4' }]}>
          <Text style={styles.remedyGraha}>{top.graha_hi}</Text>
          <Text style={styles.remedyDevta}>{rec.devta_hi}</Text>
          <View style={styles.remedyMantraBox}>
            <Text style={styles.remedyMantra}>{rec.mantra}</Text>
          </View>
          <Text style={styles.remedyMeta}>जप: {rec.count || 108}× · दिन: {rec.day_hi || '-'}</Text>
          <Text style={styles.remedyText}>{rec.remedy_hi}</Text>
        </View>
      </View>
    );
  };

  // ---------- Render ----------
  return (
    <SafeScreen>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>कुंडली लोड हो रही है…</Text>
        </View>
      ) : showForm || !kundli ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent}>
          {renderForm()}
        </ScrollView>
      ) : (
        <>
          <View style={styles.tabBar}>
            {TABS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabItem, active === t.id && styles.tabItemActive]}
                onPress={() => setActive(t.id)}
              >
                <Text style={[styles.tabText, active === t.id && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent}>
            {active === 'Charts'   && renderChartsTab()}
            {active === 'Overview' && renderOverviewTab()}
            {active === 'Analysis' && renderAnalysisTab()}
            {active === 'Remedies' && renderRemediesTab()}
          </ScrollView>
        </>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 14, color: COLORS.textSecondary, fontSize: 13 },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  tabContent: { padding: 16, paddingBottom: 100 },

  tabSection: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  dimText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 12 },
  bodyText: { fontSize: 13, color: COLORS.text, lineHeight: 22 },

  // Form
  formCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  formTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  formSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, backgroundColor: '#FFF' },
  errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12 },
  errorText: { color: '#991B1B', fontSize: 12 },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  linkBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  linkBtnText: { color: COLORS.textSecondary, fontSize: 13 },

  // User card
  userCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  userName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  userMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  ascRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  ascLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase', marginRight: 6 },
  ascValue: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  editBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  editBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Chart tabs
  chartTabBar: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 6 },
  chartTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chartTabActive: { borderColor: COLORS.primary, backgroundColor: '#FEF0EC' },
  chartTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chartTabTextActive: { color: COLORS.primary },

  // Planet table
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 0.5, borderColor: COLORS.border },
  rowHeader: { borderBottomWidth: 1 },
  cell: { flex: 1, fontSize: 12, color: COLORS.text },
  cellGraha: { fontWeight: '600' },
  cellNum: { textAlign: 'right' },
  cellHeader: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },

  // Scores
  scoreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  scoreName: { width: 50, fontSize: 12, color: COLORS.text, fontWeight: '600' },
  scoreBarBg: { flex: 1, height: 6, backgroundColor: '#F3EDEA', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreVal: { width: 28, textAlign: 'right', fontSize: 11, fontWeight: '700', color: COLORS.text },

  // Doshas
  doshaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  doshaName: { fontSize: 13, color: COLORS.text },
  doshaBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  doshaBadgeText: { fontSize: 11, fontWeight: '700' },

  // Predictions
  predictionNum: { position: 'absolute', top: 10, right: 12, fontSize: 22, fontWeight: '900', color: '#FDDDD4' },
  predictionText: { fontSize: 13, color: COLORS.text, lineHeight: 22, paddingRight: 22 },

  // Remedies
  remedyGraha: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  remedyDevta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  remedyMantraBox: { backgroundColor: '#FFF', borderLeftWidth: 3, borderLeftColor: COLORS.primary, padding: 10, marginVertical: 10, borderRadius: 6 },
  remedyMantra: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  remedyMeta: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  remedyText: { fontSize: 12, color: COLORS.text, marginBottom: 12, lineHeight: 18 },
});
