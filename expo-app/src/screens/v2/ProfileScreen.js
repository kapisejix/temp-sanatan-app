import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const displayUser = user || { name: 'User', email: '' };

  const handleLogout = () => {
    Alert.alert(
      'लॉग-आउट',
      'क्या आप लॉग-आउट करना चाहते हैं?',
      [
        { text: 'रद्द करें', style: 'cancel' },
        { text: 'लॉग-आउट', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const items = [
    { icon: '🔮', label_hi: 'मेरी कुंडली', sub: 'जन्म विवरण देखें/संपादित करें', action: () => navigation.jumpTo && navigation.jumpTo('KundliTab') },
    { icon: '⭐', label_hi: 'सब्सक्रिप्शन', sub: 'फ्री प्लान', action: () => {} },
    { icon: '🌐', label_hi: 'भाषा', sub: 'हिन्दी', action: () => {} },
    { icon: '🔔', label_hi: 'सूचनाएँ', sub: 'सक्षम', action: () => {} },
    { icon: '⚙️', label_hi: 'सेटिंग्स', sub: '', action: () => {} },
    { icon: '❓', label_hi: 'सहायता', sub: '', action: () => {} },
    { icon: 'ℹ️', label_hi: 'के बारे में', sub: 'v1.0.0', action: () => {} },
  ];

  return (
    <SafeScreen>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(displayUser.name || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{displayUser.name}</Text>
          <Text style={styles.email}>{displayUser.email}</Text>
        </View>

        {items.map((it, i) => (
          <TouchableOpacity key={i} style={styles.row} onPress={it.action}>
            <Text style={styles.rowIcon}>{it.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{it.label_hi}</Text>
              {!!it.sub && <Text style={styles.rowSub}>{it.sub}</Text>}
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logout} onPress={handleLogout} testID="profile-logout-btn">
          <Text style={styles.logoutText}>लॉग-आउट</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 100 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  name: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 10 },
  email: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  rowIcon: { fontSize: 22, marginRight: 14 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  rowArrow: { fontSize: 22, color: COLORS.textMuted },
  logout: { backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  logoutText: { color: '#991B1B', fontWeight: '700', fontSize: 14 },
});
