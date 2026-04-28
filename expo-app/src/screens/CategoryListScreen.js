// ==============================================================
// Category List Screen - Shows items in a category
// ==============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../store/authStore';
import { COLORS } from '../config/api';

export default function CategoryListScreen({ route, navigation }) {
  const { category, title } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/content/items?category=${category}`);
        setItems(data.items || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [category]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('ContentDetail', { id: item._id, title: item.title_en })}
    >
      <View style={styles.itemLeft}>
        <View style={styles.itemIcon}>
          <Text style={styles.itemIconText}>{item.deity?.[0] || 'S'}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title_hi}</Text>
          <Text style={styles.itemSubtitle}>{item.title_en}</Text>
          <Text style={styles.itemMeta}>{item.deity_hi || item.deity} | {item.total_verses} verses</Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No content found in this category</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemCard: {
    backgroundColor: COLORS.surface, padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  itemIconText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  itemSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  itemMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  arrow: { fontSize: 24, color: COLORS.textMuted },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: 14 },
});
