// ==============================================================
// Vedic Mantras Tab - Category Grid (8 tiles)
// ==============================================================
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../config/api';

const CATEGORIES = [
  { key: 'vedic_mantra', title_hi: 'वैदिक मंत्र', title_en: 'Vedic Mantras', color: '#166534' },
  { key: 'chalisa', title_hi: 'चालीसा', title_en: 'Chalisa', color: '#EA580C' },
  { key: 'ashtakam', title_hi: 'अष्टकम्', title_en: 'Ashtakam', color: '#7C3AED' },
  { key: 'sahasranama', title_hi: 'सहस्रनाम', title_en: 'Sahasranama', color: '#0369A1' },
  { key: 'katha', title_hi: 'कथा एवं पूजा', title_en: 'Katha & Puja', color: '#991B1B' },
  { key: 'arti', title_hi: 'आरती संग्रह', title_en: 'Arti Sangrah', color: '#B45309' },
  { key: 'nama_ramayanam', title_hi: 'नाम रामायणम्', title_en: 'Nama Ramayanam', color: '#0F766E' },
];

export default function VedicMantrasScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Vedic Mantras</Text>
      <Text style={styles.pageSubtitle}>Explore all spiritual content categories</Text>

      <View style={styles.grid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={styles.tile}
            onPress={() => navigation.navigate('CategoryList', { category: cat.key, title: cat.title_en })}
          >
            <View style={[styles.tileIcon, { backgroundColor: cat.color + '15' }]}>
              <Text style={[styles.tileIconText, { color: cat.color }]}>{cat.title_en.substring(0, 2)}</Text>
            </View>
            <Text style={styles.tileTitleHi}>{cat.title_hi}</Text>
            <Text style={styles.tileTitleEn}>{cat.title_en}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 18, alignItems: 'center',
  },
  tileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileIconText: { fontSize: 16, fontWeight: '800' },
  tileTitleHi: { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  tileTitleEn: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
});
