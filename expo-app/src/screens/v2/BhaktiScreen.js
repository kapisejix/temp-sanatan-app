import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import { DEITIES, DAILY_BHAKTI } from '../../data/mockData';
import SafeScreen from '../../components/SafeScreen';

export default function BhaktiScreen({ navigation }) {
  const [query, setQuery] = useState('');

  return (
    <SafeScreen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>भक्ति</Text>
          <Text style={styles.subtitle}>देवता · दैनिक · ज्ञान</Text>
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

        {/* By Deity */}
        <Text style={styles.sectionLabel}>देवता के अनुसार</Text>
        <View style={styles.deityGrid}>
          {DEITIES.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[styles.deityCard, { backgroundColor: d.color }]}
              onPress={() => navigation.navigate('DeityDetail', { deityId: d.id })}
              testID={`deity-${d.id}`}
            >
              <Text style={styles.deityEmoji}>{d.emoji}</Text>
              <Text style={styles.deityName}>{d.name_hi}</Text>
              <Text style={styles.deityNameEn}>{d.name_en}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Bhakti */}
        <Text style={styles.sectionLabel}>दैनिक भक्ति</Text>
        <View style={styles.dailyRow}>
          <View style={styles.dailyCol}>
            <Text style={styles.dailyTitle}>🌅 प्रातः मंत्र</Text>
            {DAILY_BHAKTI.morning.map(m => (
              <TouchableOpacity key={m.id} style={styles.dailyItem}
                onPress={() => navigation.navigate('ContentDetail', { contentId: m.id, source: 'daily', deityId: 'general' })}
              >
                <Text style={styles.dailyItemTitle}>{m.title_hi}</Text>
                <Text style={styles.dailyItemCount}>{m.count}× जप</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dailyCol}>
            <Text style={styles.dailyTitle}>🌙 सायं आरती</Text>
            {DAILY_BHAKTI.evening.map(e => (
              <TouchableOpacity key={e.id} style={styles.dailyItem}
                onPress={() => navigation.navigate('ContentDetail', { contentId: e.id, source: 'daily', deityId: 'general' })}
              >
                <Text style={styles.dailyItemTitle}>{e.title_hi}</Text>
                <Text style={styles.dailyItemCount}>{e.count}× आरती</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Explore */}
        <Text style={styles.sectionLabel}>एक्सप्लोर — गहन ज्ञान</Text>
        <View style={styles.exploreGrid}>
          <TouchableOpacity style={[styles.exploreCard, { backgroundColor: '#FED7AA' }]}
            onPress={() => navigation.navigate('Kathas')}
            testID="explore-kathas"
          >
            <Text style={styles.exploreIcon}>📜</Text>
            <Text style={styles.exploreTitle}>कथाएँ</Text>
            <Text style={styles.exploreSub}>सत्यनारायण, भागवत…</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exploreCard, { backgroundColor: '#FDE68A' }]}
            onPress={() => navigation.navigate('GranthList')}
            testID="explore-granth"
          >
            <Text style={styles.exploreIcon}>📖</Text>
            <Text style={styles.exploreTitle}>ग्रंथ</Text>
            <Text style={styles.exploreSub}>गीता, रामायण, महाभारत</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exploreCard, { backgroundColor: '#BFDBFE' }]}
            onPress={() => navigation.navigate('VedasPuranas')}
            testID="explore-vedas"
          >
            <Text style={styles.exploreIcon}>🕉️</Text>
            <Text style={styles.exploreTitle}>वेद और पुराण</Text>
            <Text style={styles.exploreSub}>4 वेद + पुराण</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
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
  dailyItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dailyItemTitle: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  dailyItemCount: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  exploreGrid: { gap: 10 },
  exploreCard: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  exploreIcon: { fontSize: 36 },
  exploreTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  exploreSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
