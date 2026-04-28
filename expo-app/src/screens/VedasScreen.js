// ==============================================================
// Vedas & Puranas Screen
// ==============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../store/authStore';
import { COLORS } from '../config/api';

export default function VedasScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('veda');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/vedas/books');
        setBooks(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = books.filter(b => b.category === tab);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Vedas & Puranas</Text>

      {/* Tab */}
      <View style={styles.tabs}>
        {['veda', 'purana'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'veda' ? 'Vedas' : 'Puranas'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map(book => (
        <TouchableOpacity key={book._id} style={styles.bookCard}>
          <View style={styles.bookLeft}>
            <Text style={styles.bookTitle}>{book.title_en}</Text>
            <Text style={styles.bookTitleHi}>{book.title_hi}</Text>
            <Text style={styles.bookDesc}>{book.description_en}</Text>
          </View>
          <View style={styles.bookRight}>
            <Text style={styles.chapters}>{book.total_chapters}</Text>
            <Text style={styles.chaptersLabel}>Ch.</Text>
            <View style={[styles.statusBadge, book.parsing_status === 'completed' ? styles.statusOk : styles.statusPending]}>
              <Text style={styles.statusText}>{book.parsing_status || 'pending'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {filtered.length === 0 && <Text style={styles.empty}>No {tab === 'veda' ? 'Vedas' : 'Puranas'} available yet</Text>}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#F5F5F4', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.text },
  bookCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  bookLeft: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  bookTitleHi: { fontSize: 14, color: COLORS.primary, marginTop: 2 },
  bookDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  bookRight: { alignItems: 'center', justifyContent: 'center' },
  chapters: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  chaptersLabel: { fontSize: 10, color: COLORS.textMuted },
  statusBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusOk: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 9, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
