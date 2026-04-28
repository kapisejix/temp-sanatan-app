/**
 * Screen header with back button — used in all detail screens.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../config/api';

export default function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
      ) : <View style={styles.backBtn} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={{ width: 40 }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: COLORS.text, lineHeight: 32 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
});
