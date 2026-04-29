/**
 * FloatingAIButton — bottom-right floating button to open AI Chat modal.
 *
 * IMPORTANT: This component must NOT block taps anywhere except its own 56x56 area.
 * The wrapper in App.js (withFAB) uses pointerEvents="box-none" to ensure
 * touches pass through to the screen below, only hitting the button itself.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../config/api';

export default function FloatingAIButton({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel="AI Chat"
      testID="floating-ai-button"
    >
      <Text style={styles.icon}>🤖</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    right: 20,
    bottom: 90,         // above the bottom tab bar (64px) + safe inset
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    zIndex: 10,
  },
  icon: { fontSize: 26 },
});
