// ==============================================================
// Auth Screen - Phone OTP Login (MSG91)
// ==============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { COLORS, MSG91_WIDGET_ID, MSG91_AUTH_TOKEN } from '../config/api';
import { useAuth } from '../store/authStore';
// Uncomment when MSG91 SDK is installed:
// import { OTPWidget } from '@msg91comm/sendotp-react-native';

export default function AuthScreen() {
  const { loginWithOTP } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize MSG91 widget
    // OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_AUTH_TOKEN);
  }, []);

  const handleSendOTP = async () => {
    if (phone.length !== 10) { Alert.alert('Error', 'Enter valid 10-digit phone number'); return; }
    setLoading(true);
    try {
      // Option 1: Use MSG91 widget (production)
      // const response = await OTPWidget.sendOTP({ identifier: `91${phone}` });

      // Option 2: Use our backend (dev/fallback)
      // await api.post('/auth/user/send-otp', { phone });

      setStep('otp');
    } catch (err) {
      Alert.alert('Error', 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { Alert.alert('Error', 'Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      await loginWithOTP(phone, otp);
      // Navigation handled by App.js auth state
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Verification failed');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>SS</Text>
        </View>
        <Text style={styles.title}>Sanatan Saathi</Text>
        <Text style={styles.subtitle}>Digital Spiritual Companion</Text>
      </View>

      <View style={styles.card}>
        {step === 'phone' ? (
          <>
            <Text style={styles.cardTitle}>Welcome</Text>
            <Text style={styles.cardSubtitle}>Enter your phone number to continue</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <TouchableOpacity
              style={[styles.btn, phone.length !== 10 && styles.btnDisabled]}
              onPress={handleSendOTP}
              disabled={loading || phone.length !== 10}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Verify OTP</Text>
            <Text style={styles.cardSubtitle}>Enter the 6-digit code sent to +91{phone}</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="• • • • • •"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.btn, otp.length !== 6 && styles.btnDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }}>
              <Text style={styles.changePhone}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center' },
  topSection: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  title: { fontSize: 32, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: { backgroundColor: COLORS.surface, marginHorizontal: 20, borderRadius: 20, padding: 28 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  countryCode: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  phoneInput: { flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, letterSpacing: 1, color: COLORS.text },
  otpInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 24, letterSpacing: 8, marginBottom: 16, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  changePhone: { fontSize: 14, color: COLORS.primary, textAlign: 'center', marginTop: 16 },
});
