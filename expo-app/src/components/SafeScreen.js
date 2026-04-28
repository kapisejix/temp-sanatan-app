/**
 * SafeScreen — wraps every screen with SafeAreaView (top + bottom safe insets)
 * Eliminates status bar and home indicator overlap on all phones.
 */
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../config/api';

export default function SafeScreen({ children, style, edges = ['top', 'left', 'right'] }) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: COLORS.background }, style]}>
      {children}
    </SafeAreaView>
  );
}
