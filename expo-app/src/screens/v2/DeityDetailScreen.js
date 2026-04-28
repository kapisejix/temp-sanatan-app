import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/api';
import { DEITY_CONTENT } from '../../data/mockData';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';

export default function DeityDetailScreen({ navigation, route }) {
  const deityId = route.params?.deityId || 'hanuman';
  const d = DEITY_CONTENT[deityId];

  if (!d) {
    return (
      <SafeScreen>
        <ScreenHeader title="त्रुटि" onBack={() => navigation.goBack()} />
        <View style={{ padding: 20 }}><Text>देवता नहीं मिला</Text></View>
      </SafeScreen>
    );
  }

  // Group items by type for cleaner UI
  const grouped = d.items.reduce((acc, it) => {
    (acc[it.type] = acc[it.type] || []).push(it);
    return acc;
  }, {});
  const TYPE_LABELS = { aarti: '🪔 आरती', chalisa: '📿 चालीसा', mantra: '🕉️ मंत्र', stotram: '📜 स्तोत्र' };

  return (
    <SafeScreen>
      <ScreenHeader title={`${d.emoji} ${d.name_hi}`} subtitle={d.name_en} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.descCard}>
          <Text style={styles.desc}>{d.description_hi}</Text>
        </View>

        {Object.keys(grouped).map(type => (
          <View key={type} style={{ marginBottom: 16 }}>
            <Text style={styles.sectionLabel}>{TYPE_LABELS[type] || type}</Text>
            {grouped[type].map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => navigation.navigate('ContentDetail', { contentId: item.id, deityId })}
                testID={`bhakti-item-${item.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title_hi}</Text>
                  <Text style={styles.itemMeta}>{item.title_en} · {item.duration} · {item.plays}</Text>
                </View>
                <View style={styles.playPill}>
                  <Text style={styles.playPillText}>▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  descCard: { backgroundColor: '#FEF0EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDDDD4', marginBottom: 16 },
  desc: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, letterSpacing: 0.3 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  itemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  playPill: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  playPillText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
