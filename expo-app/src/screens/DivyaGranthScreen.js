// ==============================================================
// Divya Granth Screen - Sacred Texts Library
// ==============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../store/authStore';
import { COLORS } from '../config/api';

export default function DivyaGranthScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/granth/books');
        setBooks(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Divya Granth</Text>
      <Text style={styles.pageSubtitle}>Sacred Texts - Read & Listen</Text>

      {books.map((book) => (
        <TouchableOpacity key={book._id} style={styles.bookCard}
          onPress={() => navigation.navigate('BookDetail', { id: book._id, title: book.title_en })}
        >
          <View style={styles.bookIcon}>
            <Text style={styles.bookIconText}>{book.title_en?.[0]}</Text>
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitleHi}>{book.title_hi}</Text>
            <Text style={styles.bookTitleEn}>{book.title_en}</Text>
            <Text style={styles.bookDesc} numberOfLines={2}>{book.description_en}</Text>
            <View style={styles.bookMeta}>
              <Text style={styles.bookMetaText}>{book.total_chapters} Chapters</Text>
              <Text style={styles.bookMetaDot}>·</Text>
              <Text style={styles.bookMetaText}>{book.total_verses?.toLocaleString()} Verses</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  bookCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 18, marginBottom: 14,
    flexDirection: 'row', gap: 16,
  },
  bookIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  bookIconText: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  bookInfo: { flex: 1 },
  bookTitleHi: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  bookTitleEn: { fontSize: 14, color: COLORS.primary, marginTop: 2 },
  bookDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, lineHeight: 18 },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  bookMetaText: { fontSize: 11, color: COLORS.textMuted },
  bookMetaDot: { fontSize: 11, color: COLORS.textMuted },
});
