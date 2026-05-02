import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('कृपया ईमेल और पासवर्ड दर्ज करें');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      // AuthProvider switches navigator automatically
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'लॉग-इन विफल — पुनः प्रयास करें');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🪔</Text>
          <Text style={styles.title}>सनातन साथी</Text>
          <Text style={styles.subtitle}>आपका आध्यात्मिक मार्गदर्शक</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>लॉग-इन करें</Text>

          <Text style={styles.label}>ईमेल</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="aap@example.com"
            placeholderTextColor="#9AA0A6"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            testID="login-email-input"
          />

          <Text style={styles.label}>पासवर्ड</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9AA0A6"
            secureTextEntry
            style={styles.input}
            testID="login-password-input"
          />

          {error ? (
            <View style={styles.errBox} testID="login-error">
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            testID="login-submit-btn"
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.primaryBtnText}>लॉग-इन</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            style={styles.linkBtn}
            testID="login-go-signup"
          >
            <Text style={styles.linkText}>
              खाता नहीं है? <Text style={styles.linkBold}>साइन-अप करें</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 28 },
  brandIcon: { fontSize: 56, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.text, backgroundColor: '#FFF' },
  errBox: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12 },
  errText: { color: '#991B1B', fontSize: 12 },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 18 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  linkText: { fontSize: 13, color: COLORS.textSecondary },
  linkBold: { fontWeight: '700', color: COLORS.primary },
});
