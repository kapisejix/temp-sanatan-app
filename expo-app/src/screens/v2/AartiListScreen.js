import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../api/client';

const DEITY_COLORS = {
  Hanuman: '#FED7AA', Shiva: '#BFDBFE', Krishna: '#DBEAFE',
  Durga: '#FECACA', Ganesha: '#FDE68A', Rama: '#FCD34D',
  Vishnu: '#C7D2FE', Lakshmi: '#FDE68A', Saraswati: '#BAE6FD',
};

export default function AartiListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.listBhaktiItems('aarti', 'published');
      const list = Array.isArray(data) ? data : (data.items || []);
      setItems(list);
    } catch {
      setError('आरती सूची लोड नहीं हो सकी — बैकेंड कनेक्शन जाँचें');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchItems(true); };

  return (
    <SafeScreen>
      <ScreenHeader
        title="🪔 आरती संग्रह"
        subtitle={items.length ? `${items.length} आरतियाँ` : 'सभी आरतियाँ'}
        onBack={() => navigation.goBack()}
      />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>आरती लोड हो रही है…</Text>
        </View>
      )}

      {!!error && !loading && (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchItems()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>पुनः प्रयास करें</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {items.map((item) => {
            const deity = item.deity || '';
            const accent = DEITY_COLORS[deity] || '#FEF0EC';
            return (
              <TouchableOpacity
                key={item._id}
                style={[styles.card, { borderLeftColor: COLORS.primary, borderLeftWidth: 3 }]}
                onPress={() => navigation.navigate('ContentDetail', { contentId: item._id })}
                testID={`aarti-item-${item._id}`}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: accent }]}>
                  <Text style={styles.iconText}>🪔</Text>
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title_hi || item.title_en || '—'}
                  </Text>
                  {item.title_en && item.title_hi && (
                    <Text style={styles.itemTitleEn} numberOfLines={1}>{item.title_en}</Text>
                  )}
                  {deity ? (
                    <Text style={styles.deityTag}>{deity}</Text>
                  ) : null}
                </View>
                <View style={styles.playPill}>
                  <Text style={styles.playPillText}>▶</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {!loading && items.length === 0 && !error && (
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🪔</Text>
              <Text style={styles.emptyText}>कोई प्रकाशित आरती नहीं मिली</Text>
              <Text style={styles.emptyHint}>Admin Panel से आरती प्रकाशित करें</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: 13 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconText: { fontSize: 22 },
  textBlock: { flex: 1, marginRight: 8 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  itemTitleEn: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  deityTag: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#FEF0EC', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, fontSize: 10, color: COLORS.primary, fontWeight: '700',
  },
  playPill: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  playPillText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  errBox: { margin: 16, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 16, alignItems: 'center' },
  errText: { color: '#991B1B', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 12, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
});
