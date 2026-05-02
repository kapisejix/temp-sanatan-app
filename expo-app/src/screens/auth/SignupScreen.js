import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) return setError('नाम कम-से-कम 2 अक्षर का हो');
    if (!email.trim() || !email.includes('@')) return setError('मान्य ईमेल दें');
    if (password.length < 6) return setError('पासवर्ड कम-से-कम 6 अक्षर का हो');
    if (password !== confirm) return setError('दोनों पासवर्ड समान होने चाहिए');
    setError('');
    setLoading(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'साइन-अप विफल — पुनः प्रयास करें');
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
          <Text style={styles.title}>नया खाता बनाएं</Text>
          <Text style={styles.subtitle}>आज से अपनी आध्यात्मिक यात्रा शुरू करें</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>पूरा नाम</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="जैसे: रवि शर्मा"
            placeholderTextColor="#9AA0A6"
            autoCapitalize="words"
            style={styles.input}
            testID="signup-name-input"
          />

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
            testID="signup-email-input"
          />

          <Text style={styles.label}>मोबाइल (वैकल्पिक)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 9999999999"
            placeholderTextColor="#9AA0A6"
            keyboardType="phone-pad"
            style={styles.input}
            testID="signup-phone-input"
          />

          <Text style={styles.label}>पासवर्ड (कम-से-कम 6 अक्षर)</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9AA0A6"
            secureTextEntry
            style={styles.input}
            testID="signup-password-input"
          />

          <Text style={styles.label}>पासवर्ड पुष्टि</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor="#9AA0A6"
            secureTextEntry
            style={styles.input}
            testID="signup-confirm-input"
          />

          {error ? (
            <View style={styles.errBox} testID="signup-error">
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            testID="signup-submit-btn"
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.primaryBtnText}>खाता बनाएं</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkBtn}
            testID="signup-go-login"
          >
            <Text style={styles.linkText}>
              पहले से खाता है? <Text style={styles.linkBold}>लॉग-इन करें</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 22 },
  brandIcon: { fontSize: 50, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: COLORS.border },
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
