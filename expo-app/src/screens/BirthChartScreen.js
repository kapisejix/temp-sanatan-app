// ==============================================================
// Birth Chart Screen - Nakshatra Analysis for Expo App
// ==============================================================
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../store/authStore';
import { COLORS } from '../config/api';

export default function BirthChartScreen() {
  const [form, setForm] = useState({ name: '', dob: '', birth_time: '', birth_place: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!form.name || !form.dob) { setError('Name and DOB required'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/public/birth-chart', form);
      setResult(data);
    } catch (err) { setError(err.response?.data?.detail || 'Analysis failed'); }
    finally { setLoading(false); }
  };

  const chart = result?.chart;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nakshatra Birth Chart</Text>
      <Text style={styles.subtitle}>Discover your spiritual path</Text>

      {/* Form */}
      <View style={styles.formCard}>
        <TextInput style={styles.input} value={form.name} onChangeText={v => setForm({...form, name: v})} placeholder="Full Name" placeholderTextColor={COLORS.textMuted} />
        <TextInput style={styles.input} value={form.dob} onChangeText={v => setForm({...form, dob: v})} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor={COLORS.textMuted} />
        <TextInput style={styles.input} value={form.birth_time} onChangeText={v => setForm({...form, birth_time: v})} placeholder="Birth Time (HH:MM) - optional" placeholderTextColor={COLORS.textMuted} />
        <TextInput style={styles.input} value={form.birth_place} onChangeText={v => setForm({...form, birth_place: v})} placeholder="Birth Place - optional" placeholderTextColor={COLORS.textMuted} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btn, loading && {opacity: 0.5}]} onPress={analyze} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze My Chart</Text>}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {chart && (
        <View style={styles.results}>
          {/* Nakshatra Card */}
          <View style={styles.nakshatraCard}>
            <Text style={styles.nLabel}>Your Nakshatra</Text>
            <Text style={styles.nName}>{chart.nakshatra?.name_en}</Text>
            <Text style={styles.nNameHi}>{chart.nakshatra?.name_hi}</Text>
            <View style={styles.nRow}>
              <View style={styles.nItem}><Text style={styles.nItemLabel}>Rashi</Text><Text style={styles.nItemValue}>{chart.rashi?.name_en}</Text></View>
              <View style={styles.nItem}><Text style={styles.nItemLabel}>Planet</Text><Text style={styles.nItemValue}>{chart.ruling_graha?.name_en}</Text></View>
            </View>
          </View>

          {/* Daily Mantras */}
          {chart.daily_mantras?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Mantras</Text>
              {chart.daily_mantras.map((m, i) => (
                <View key={i} style={styles.mantraCard}>
                  <Text style={styles.mantraSa}>{m.mantra_sa}</Text>
                  <Text style={styles.mantraTrans}>{m.mantra_transliteration}</Text>
                  <Text style={styles.mantraMeaning}>{m.meaning_hi}</Text>
                  <Text style={styles.mantraMeta}>Chant {m.count}x | {m.when_to_chant}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Grah Dosh */}
          {chart.grah_dosh?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grah Dosh</Text>
              {chart.grah_dosh.map((d, i) => (
                <View key={i} style={styles.doshCard}>
                  <Text style={styles.doshGraha}>{d.graha} - {d.dosh_name}</Text>
                  <Text style={styles.doshDesc}>{d.description_hi}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Pujas */}
          {chart.recommended_pujas?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended Pujas</Text>
              {chart.recommended_pujas.map((p, i) => (
                <View key={i} style={styles.pujaCard}>
                  <Text style={styles.pujaName}>{p.puja_name_hi}</Text>
                  <Text style={styles.pujaNameEn}>{p.puja_name_en}</Text>
                  <Text style={styles.pujaDesc}>{p.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Gemstone */}
          {chart.gemstone && (
            <View style={styles.gemCard}>
              <Text style={styles.gemLabel}>Recommended Gemstone</Text>
              <Text style={styles.gemName}>{chart.gemstone.name_en} ({chart.gemstone.name_hi})</Text>
              <Text style={styles.gemDetail}>Finger: {chart.gemstone.wearing_finger} | Day: {chart.gemstone.wearing_day}</Text>
            </View>
          )}
        </View>
      )}
      <View style={{height: 100}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 20, gap: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
  results: { marginTop: 20, gap: 16 },
  nakshatraCard: { backgroundColor: '#FFF7ED', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FFEDD5' },
  nLabel: { fontSize: 11, fontWeight: '700', color: '#9A3412', letterSpacing: 2, textTransform: 'uppercase' },
  nName: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  nNameHi: { fontSize: 20, color: COLORS.primary },
  nRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  nItem: { alignItems: 'center' },
  nItemLabel: { fontSize: 10, color: '#9A3412', fontWeight: '600' },
  nItemValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  mantraCard: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, marginBottom: 10 },
  mantraSa: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  mantraTrans: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  mantraMeaning: { fontSize: 13, color: COLORS.text, marginTop: 6 },
  mantraMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  doshCard: { borderLeftWidth: 3, borderLeftColor: '#991B1B', paddingLeft: 12, marginBottom: 10 },
  doshGraha: { fontSize: 14, fontWeight: '600', color: '#991B1B' },
  doshDesc: { fontSize: 13, color: COLORS.text, marginTop: 4 },
  pujaCard: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  pujaName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  pujaNameEn: { fontSize: 12, color: COLORS.primary },
  pujaDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  gemCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  gemLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', letterSpacing: 1.5, textTransform: 'uppercase' },
  gemName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  gemDetail: { fontSize: 12, color: '#92400E', marginTop: 4 },
});
