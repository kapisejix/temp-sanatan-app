import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import { DEITIES, BHAKTI_TYPES, DAILY_BHAKTI } from '../../data/mockData';

export default function BhaktiScreen({ navigation }) {
  const [query, setQuery] = useState('');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>भक्ति</Text>
        <Text style={styles.subtitle}>आरती, चालीसा, मंत्र, स्तोत्र</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="खोजें — हनुमान चालीसा, गायत्री मंत्र…"
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
        />
      </View>

      <Text style={styles.sectionLabel}>देवता के अनुसार</Text>
      <View style={styles.deityGrid}>
        {DEITIES.map(d => (
          <TouchableOpacity key={d.id} style={[styles.deityCard, { backgroundColor: d.color }]}>
            <Text style={styles.deityEmoji}>{d.emoji}</Text>
            <Text style={styles.deityName}>{d.name_hi}</Text>
            <Text style={styles.deityNameEn}>{d.name_en}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>दैनिक भक्ति</Text>
      <View style={styles.dailyRow}>
        <View style={styles.dailyCol}>
          <Text style={styles.dailyTitle}>🌅 प्रातः मंत्र</Text>
          {DAILY_BHAKTI.morning.map(m => (
            <View key={m.id} style={styles.dailyItem}>
              <Text style={styles.dailyItemTitle}>{m.title_hi}</Text>
              <Text style={styles.dailyItemCount}>{m.count}× जप</Text>
            </View>
          ))}
        </View>
        <View style={styles.dailyCol}>
          <Text style={styles.dailyTitle}>🌙 सायं आरती</Text>
          {DAILY_BHAKTI.evening.map(e => (
            <View key={e.id} style={styles.dailyItem}>
              <Text style={styles.dailyItemTitle}>{e.title_hi}</Text>
              <Text style={styles.dailyItemCount}>{e.count}× आरती</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>प्रकार के अनुसार</Text>
      <View style={styles.typeGrid}>
        {BHAKTI_TYPES.map(t => (
          <TouchableOpacity key={t.id} style={styles.typeCard}>
            <Text style={styles.typeIcon}>{t.icon}</Text>
            <Text style={styles.typeName}>{t.name_hi}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 18 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 6, letterSpacing: 0.3 },
  deityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  deityCard: { width: '31%', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  deityEmoji: { fontSize: 30 },
  deityName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  deityNameEn: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  dailyRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  dailyCol: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  dailyTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  dailyItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dailyItemTitle: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  dailyItemCount: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { width: '31%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  typeIcon: { fontSize: 24 },
  typeName: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 4 },
});
