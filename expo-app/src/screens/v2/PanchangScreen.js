import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import { TODAY_PANCHANG, MONTHLY_PANCHANG, FESTIVALS, MUHURATS } from '../../data/mockData';

const TABS = ['Today', 'Monthly', 'Festivals', 'Muhurat'];
const TAB_LABELS = { Today: 'आज', Monthly: 'मासिक', Festivals: 'त्योहार', Muhurat: 'मुहूर्त' };

function TodayTab() {
  const t = TODAY_PANCHANG;
  return (
    <View>
      <View style={styles.bigCard}>
        <Text style={styles.bigDate}>{t.date}</Text>
        <Text style={styles.bigDay}>{t.weekday_hi}</Text>
      </View>
      <View style={styles.grid}>
        {[
          ['तिथि', t.tithi_hi],
          ['नक्षत्र', t.nakshatra_hi],
          ['योग', t.yoga_hi],
          ['करण', t.karana_hi],
          ['सूर्योदय', t.sunrise],
          ['सूर्यास्त', t.sunset],
          ['राहु काल', t.rahu_kaal],
        ].map(([k, v]) => (
          <View key={k} style={styles.gridCell}>
            <Text style={styles.gridLabel}>{k}</Text>
            <Text style={styles.gridValue}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthlyTab() {
  return (
    <View>
      {MONTHLY_PANCHANG.map((m, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.dateBox}><Text style={styles.dateText}>{m.date}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{m.tithi_hi}</Text>
            <Text style={styles.rowMeta}>{m.special_hi}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function FestivalsTab() {
  return (
    <View>
      {FESTIVALS.map((f, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.festivalEmoji}>🪔</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{f.name_hi}</Text>
            <Text style={styles.rowMeta}>{f.date}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MuhuratTab() {
  return (
    <View>
      {MUHURATS.map((m, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.dateBox}><Text style={styles.dateText}>{m.date.split(' ')[0]}</Text><Text style={styles.dateMonth}>{m.date.split(' ')[1]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{m.type_hi}</Text>
            <Text style={styles.rowMeta}>⏰ {m.time}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function PanchangScreen() {
  const [active, setActive] = useState('Today');
  return (
    <View style={styles.root}>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tabItem, active === t && styles.tabItemActive]} onPress={() => setActive(t)}>
            <Text style={[styles.tabText, active === t && styles.tabTextActive]}>{TAB_LABELS[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabContent}>
        {active === 'Today' && <TodayTab />}
        {active === 'Monthly' && <MonthlyTab />}
        {active === 'Festivals' && <FestivalsTab />}
        {active === 'Muhurat' && <MuhuratTab />}
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
  bigCard: { backgroundColor: '#FEF0EC', borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#FDDDD4', marginBottom: 14 },
  bigDate: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  bigDay: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  gridCell: { width: '50%', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, borderRightWidth: 1, borderRightColor: COLORS.border },
  gridLabel: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  gridValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  dateBox: { width: 50, backgroundColor: '#FEF0EC', borderRadius: 8, padding: 6, alignItems: 'center', marginRight: 12 },
  dateText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  dateMonth: { fontSize: 9, color: COLORS.textSecondary },
  rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  festivalEmoji: { fontSize: 30, marginRight: 12 },
});
