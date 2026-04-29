/**
 * SafeScreen — wraps every screen with SafeAreaView (top + bottom safe insets).
 * Eliminates status bar / home indicator / Android nav overlap on all phones.
 *
 * Default edges: ['top', 'bottom'] per project standard.
 * Tab root screens automatically reserve space for the tab bar via React Navigation,
 * so this padding is additive but harmless.
 */
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../config/api';

export default function SafeScreen({ children, style, edges = ['top', 'bottom'] }) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: COLORS.background }, style]}>
      {children}
    </SafeAreaView>
  );
}
