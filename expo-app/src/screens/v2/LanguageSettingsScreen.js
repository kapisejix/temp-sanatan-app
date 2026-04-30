import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { COLORS } from '../../config/api';
import SafeScreen from '../../components/SafeScreen';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '../../contexts/AuthContext';

const LANGUAGES = [
  { code: 'hi', label: 'हिन्दी',  label_en: 'Hindi',    sub: 'Default — सबसे अधिक उपलब्ध सामग्री' },
  { code: 'en', label: 'English', label_en: 'English',  sub: 'Translations + transliterations' },
  { code: 'sa', label: 'संस्कृत', label_en: 'Sanskrit', sub: 'Classical scripture language' },
  { code: 'mr', label: 'मराठी',   label_en: 'Marathi',  sub: 'Maharashtra' },
  { code: 'gu', label: 'ગુજરાતી', label_en: 'Gujarati', sub: 'Gujarat' },
  { code: 'ta', label: 'தமிழ்',   label_en: 'Tamil',    sub: 'Tamil Nadu' },
  { code: 'te', label: 'తెలుగు',  label_en: 'Telugu',   sub: 'Andhra Pradesh / Telangana' },
  { code: 'bn', label: 'বাংলা',   label_en: 'Bengali',  sub: 'West Bengal' },
];

export default function LanguageSettingsScreen({ navigation }) {
  const { user, updatePreferredLanguage } = useAuth();
  const [saving, setSaving] = useState(null); // lang code currently being persisted
  const current = user?.preferred_language || 'hi';

  const choose = async (code) => {
    if (code === current) return;
    setSaving(code);
    try {
      await updatePreferredLanguage(code);
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.detail || 'Please check your connection and try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <SafeScreen>
      <ScreenHeader
        title="भाषा · Language"
        subtitle="Choose the language used for aartis, chalisas and lyrics"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.helper}>
          Your choice is saved to your account — it will persist across devices.
          You can change it anytime from Profile → Language.
        </Text>

        {LANGUAGES.map((l) => {
          const active = current === l.code;
          const loading = saving === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              onPress={() => choose(l.code)}
              disabled={!!saving}
              testID={`lang-option-${l.code}`}
              style={[styles.row, active && styles.rowActive]}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, active && styles.labelActive]}>{l.label_en}</Text>
                <Text style={styles.labelNative} lang={l.code}>{l.label}</Text>
                <Text style={styles.sub}>{l.sub}</Text>
              </View>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : active ? (
                <View style={styles.check}><Text style={styles.checkTxt}>✓</Text></View>
              ) : (
                <View style={styles.dot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body:       { padding: 16, gap: 10, paddingBottom: 40 },
  helper:     { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 18 },
  row:        {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border,
    padding: 14, borderRadius: 12,
  },
  rowActive:  { borderColor: COLORS.primary, backgroundColor: '#FFF4EE' },
  label:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  labelActive:{ color: COLORS.primary },
  labelNative:{ fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  sub:        { fontSize: 11, color: '#989EA4', marginTop: 4 },
  dot:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E0DAD6' },
  check:      {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkTxt:   { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
