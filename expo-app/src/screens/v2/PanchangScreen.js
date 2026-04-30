import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import { TODAY_PANCHANG, MONTHLY_PANCHANG, FESTIVALS, MUHURATS } from '../../data/mockData';
import api from '../../api/client';
import useApiData from '../../hooks/useApiData';
import SafeScreen from '../../components/SafeScreen';

const TABS = ['Today', 'Monthly', 'Festivals', 'Muhurat'];
const TAB_LABELS = { Today: 'आज', Monthly: 'मासिक', Festivals: 'त्योहार', Muhurat: 'मुहूर्त' };

function TodayTab() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data } = useApiData(() => api.getPanchangDay({}), null, []);
  const t = data || TODAY_PANCHANG;

  return (
    <View>
      {/* Hero / Main Line */}
      <View style={styles.hero}>
        <Text style={styles.heroDate}>{t.date_str_hi || t.date}</Text>
        <Text style={styles.heroDay}>{t.weekday_hi}</Text>
        <View style={styles.heroDivider} />
        <Text style={styles.heroMain}>{t.main_line_hi || `${t.tithi_hi}`}</Text>
        <View style={styles.heroSunRow}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.sunLabel}>🌅 सूर्योदय</Text>
            <Text style={styles.sunValue}>{t.sunrise}</Text>
          </View>
          <View style={styles.heroSunSep} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.sunLabel}>🌇 सूर्यास्त</Text>
            <Text style={styles.sunValue}>{t.sunset}</Text>
          </View>
        </View>
      </View>

      {/* Summary card */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>पंचांग सारांश</Text>
        <View style={styles.grid}>
          {[
            ['तिथि', t.tithi_hi, t.tithi_end && `${t.tithi_end} तक`],
            ['नक्षत्र', t.nakshatra_hi, t.nakshatra_end && `${t.nakshatra_end} तक`],
            ['योग', t.yoga_hi, t.yoga_end && `${t.yoga_end} तक`],
            ['करण', t.karana_hi, null],
          ].map(([k, v, sub]) => (
            <View key={k} style={styles.gridCell}>
              <Text style={styles.gridLabel}>{k}</Text>
              <Text style={styles.gridValue}>{v || '-'}</Text>
              {sub ? <Text style={styles.gridSub}>{sub}</Text> : null}
            </View>
          ))}
        </View>
      </View>

      {/* Shubh Muhurat */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>✨ शुभ मुहूर्त</Text>
        {t.abhijit_muhurta ? (
          <View style={styles.muhRow}>
            <Text style={styles.muhName}>अभिजित मुहूर्त</Text>
            <Text style={styles.muhTime}>{t.abhijit_muhurta}</Text>
          </View>
        ) : (
          <Text style={styles.muhNone}>आज अभिजित मुहूर्त नहीं (बुधवार)</Text>
        )}
        {t.amrit_kalam ? (
          <View style={styles.muhRow}>
            <Text style={styles.muhName}>अमृत काल</Text>
            <Text style={styles.muhTime}>{t.amrit_kalam}</Text>
          </View>
        ) : null}
      </View>

      {/* Ashubh Kaal */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>⚠️ अशुभ काल</Text>
        <View style={styles.muhRow}>
          <Text style={styles.muhName}>राहु काल</Text>
          <Text style={styles.muhTime}>{t.rahu_kaal || '-'}</Text>
        </View>
        {t.gulika_kaal ? (
          <View style={styles.muhRow}>
            <Text style={styles.muhName}>गुलिक काल</Text>
            <Text style={styles.muhTime}>{t.gulika_kaal}</Text>
          </View>
        ) : null}
        {t.yamagandam ? (
          <View style={styles.muhRow}>
            <Text style={styles.muhName}>यमगण्ड</Text>
            <Text style={styles.muhTime}>{t.yamagandam}</Text>
          </View>
        ) : null}
      </View>

      {/* Festivals */}
      {t.festivals?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎉 आज के पर्व</Text>
          {t.festivals.map((f, i) => (
            <View key={f.key || i} style={styles.festRow}>
              <Text style={styles.festName}>{f.name_hi}</Text>
              <Text style={styles.festDesc}>{f.description_hi}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Flags */}
      {(t.is_bhadra || t.is_panchak) && (
        <View style={[styles.section, styles.flagsSection]}>
          {t.is_bhadra && (
            <Text style={styles.flagText}>⚠️ भद्रा काल सक्रिय — शुभ कार्य टालें</Text>
          )}
          {t.is_panchak && (
            <Text style={styles.flagText}>⚠️ पंचक दोष — यात्रा / निर्माण से बचें</Text>
          )}
        </View>
      )}

      {/* Advanced toggle */}
      <TouchableOpacity style={styles.advToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
        <Text style={styles.advToggleText}>
          {showAdvanced ? '▲ उन्नत विवरण छिपाएँ' : '▼ उन्नत विवरण देखें'}
        </Text>
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>उन्नत विवरण</Text>
          <View style={styles.advRow}>
            <Text style={styles.advLabel}>मास</Text>
            <Text style={styles.advValue}>{t.month_hi}</Text>
          </View>
          <View style={styles.advRow}>
            <Text style={styles.advLabel}>पक्ष</Text>
            <Text style={styles.advValue}>{t.paksha_hi}</Text>
          </View>
          <View style={styles.advRow}>
            <Text style={styles.advLabel}>नक्षत्र स्वामी</Text>
            <Text style={styles.advValue}>{t.nakshatra_lord || '-'}</Text>
          </View>
          <View style={styles.advRow}>
            <Text style={styles.advLabel}>सौर दोपहर</Text>
            <Text style={styles.advValue}>{t.solar_noon || '-'}</Text>
          </View>
          <View style={styles.advRow}>
            <Text style={styles.advLabel}>प्रणाली</Text>
            <Text style={styles.advValue}>{t.system === 'south' ? 'दक्षिण (अमान्त)' : 'उत्तर (पूर्णिमान्त)'}</Text>
          </View>
        </View>
      )}
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
    <SafeScreen>
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
    </SafeScreen>
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

  // Hero
  hero: {
    backgroundColor: '#FEF0EC', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#FDDDD4', marginBottom: 16,
  },
  heroDate: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroDay: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: '#FDDDD4', marginVertical: 12 },
  heroMain: { fontSize: 14, color: COLORS.text, lineHeight: 22, fontWeight: '600' },
  heroSunRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  heroSunSep: { width: 1, height: 28, backgroundColor: '#FDDDD4', marginHorizontal: 8 },
  sunLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 2, textTransform: 'uppercase' },
  sunValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Sections
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  gridSub: { fontSize: 10, color: COLORS.primary, fontWeight: '600', marginTop: 2 },

  // Muhurta rows
  muhRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  muhName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  muhTime: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  muhNone: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', paddingVertical: 6 },

  // Festival rows
  festRow: {
    backgroundColor: '#ECFDF5', borderColor: '#86EFAC', borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 6,
  },
  festName: { fontSize: 14, fontWeight: '800', color: '#064E3B' },
  festDesc: { fontSize: 12, color: '#065F46', marginTop: 4, lineHeight: 18 },

  // Flags
  flagsSection: { backgroundColor: '#FEF3C7', borderColor: '#FDE047', borderWidth: 1, borderRadius: 10, padding: 12 },
  flagText: { fontSize: 12, color: '#78350F', fontWeight: '600', paddingVertical: 2 },

  // Advanced
  advToggle: { alignItems: 'center', paddingVertical: 12 },
  advToggleText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  advRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  advLabel: { fontSize: 12, color: COLORS.textSecondary },
  advValue: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
});
