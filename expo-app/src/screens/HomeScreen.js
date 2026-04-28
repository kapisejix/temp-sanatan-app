// ==============================================================
// Home Screen - Daily Shloka, Panchang, Quick Access
// ==============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { api } from '../store/authStore';
import { COLORS, TAB_COLORS } from '../config/api';

const CATEGORY_ICONS = {
  vedic_mantra: 'OM',
  chalisa: 'CH',
  ashtakam: 'AS',
  sahasranama: 'SN',
  katha: 'KA',
  arti: 'AR',
  nama_ramayanam: 'NR',
  granth: 'GR',
};

export default function HomeScreen({ navigation }) {
  const [homeData, setHomeData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [daily, cats] = await Promise.all([
        api.get('/home/daily'),
        api.get('/home/categories'),
      ]);
      setHomeData(daily.data);
      setCategories(cats.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const panchang = homeData?.panchang;
  const dailyShloka = homeData?.daily_shloka;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      {/* Greeting */}
      <View style={styles.greetingCard}>
        <Text style={styles.greeting}>{homeData?.greeting || 'ॐ नमः शिवाय'}</Text>
        <Text style={styles.date}>{homeData?.date || ''}</Text>
        <Text style={styles.dayOfWeek}>{homeData?.day_of_week || ''}</Text>
      </View>

      {/* Daily Shloka Card */}
      {dailyShloka && (
        <TouchableOpacity
          style={styles.shlokaCard}
          onPress={() => navigation.navigate('ContentDetail', { id: dailyShloka._id })}
        >
          <Text style={styles.shlokaLabel}>Today's Shloka</Text>
          <Text style={styles.shlokaTitle}>{dailyShloka.title_hi}</Text>
          <Text style={styles.shlokaSubtitle}>{dailyShloka.title_en}</Text>
          <Text style={styles.shlokaDeity}>{dailyShloka.deity_hi || dailyShloka.deity}</Text>
        </TouchableOpacity>
      )}

      {/* Panchang Strip */}
      {panchang && (
        <View style={styles.panchangCard}>
          <Text style={styles.sectionTitle}>Today's Panchang</Text>
          <View style={styles.panchangGrid}>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Tithi</Text>
              <Text style={styles.panchangValue}>{panchang.tithi}</Text>
            </View>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Nakshatra</Text>
              <Text style={styles.panchangValue}>{panchang.nakshatra}</Text>
            </View>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Sunrise</Text>
              <Text style={styles.panchangValue}>{panchang.sunrise}</Text>
            </View>
            <View style={styles.panchangItem}>
              <Text style={styles.panchangLabel}>Sunset</Text>
              <Text style={styles.panchangValue}>{panchang.sunset}</Text>
            </View>
          </View>
          {panchang.festival_name ? (
            <View style={styles.festivalBanner}>
              <Text style={styles.festivalText}>{panchang.festival_name}</Text>
            </View>
          ) : null}
          {homeData?.vrat ? (
            <View style={styles.vratBanner}>
              <Text style={styles.vratText}>{homeData.vrat.name_hi} - {homeData.vrat.name_en}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Category Grid */}
      <Text style={styles.sectionTitle}>Explore</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={styles.categoryTile}
            onPress={() => navigation.navigate('CategoryList', { category: cat.key, title: cat.title_en })}
          >
            <View style={styles.categoryIcon}>
              <Text style={styles.categoryIconText}>{CATEGORY_ICONS[cat.key] || cat.key[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.categoryName}>{cat.title_hi}</Text>
            <Text style={styles.categoryNameEn}>{cat.title_en}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  greetingCard: {
    backgroundColor: COLORS.primary, padding: 24, paddingTop: 60,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  greeting: { fontSize: 28, fontWeight: '700', color: '#fff' },
  date: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  dayOfWeek: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' },
  shlokaCard: {
    backgroundColor: COLORS.surface, margin: 16, padding: 20,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  shlokaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  shlokaTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  shlokaSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  shlokaDeity: { fontSize: 12, color: COLORS.primary, marginTop: 8 },
  panchangCard: {
    backgroundColor: COLORS.surface, margin: 16, padding: 20,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  panchangGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panchangItem: { width: '47%', backgroundColor: COLORS.accent, padding: 12, borderRadius: 12 },
  panchangLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  panchangValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  festivalBanner: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, marginTop: 12 },
  festivalText: { fontSize: 13, fontWeight: '600', color: '#92400E', textAlign: 'center' },
  vratBanner: { backgroundColor: '#DBEAFE', padding: 10, borderRadius: 10, marginTop: 8 },
  vratText: { fontSize: 12, fontWeight: '500', color: '#1E40AF', textAlign: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  categoryTile: {
    width: '23%', backgroundColor: COLORS.surface, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  categoryIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  categoryIconText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  categoryName: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  categoryNameEn: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
});
