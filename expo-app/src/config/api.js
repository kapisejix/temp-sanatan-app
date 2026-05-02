// ==============================================================
// SanatanSaathi - Expo Mobile App
// API Configuration
// ==============================================================

// IMPORTANT: Replace with your deployed backend URL
//export const API_BASE_URL = 'https://integrated-platform-13.preview.emergentagent.com/api';
export const API_BASE_URL = 'http://192.168.1.4:8001/api';

// MSG91 Configuration (get from your MSG91 dashboard)
export const MSG91_WIDGET_ID = 'YOUR_WIDGET_ID';
export const MSG91_AUTH_TOKEN = 'YOUR_AUTH_TOKEN';

// App Config
export const APP_CONFIG = {
  name: 'Sanatan Saathi',
  tagline: 'Digital Spiritual Companion',
  version: '1.0.0',
  defaultLanguage: 'hi',
  supportedLanguages: ['hi', 'en', 'sa', 'mr', 'gu', 'ta', 'te', 'bn', 'kn', 'ml', 'pa', 'od'],
};

// Tab Colors (from Blueprint)
export const TAB_COLORS = {
  home: '#7C3AED',       // Deep Violet
  vedicMantras: '#166534', // Forest Green
  divyaGranth: '#B45309',  // Amber Gold
  vedas: '#0369A1',       // Ocean Blue
  vedaChat: '#7C3AED',    // Mystic Violet
};

// Theme Colors
export const COLORS = {
  primary: '#E95A34',      // Vibrant Saffron-Orange
  primaryDark: '#D04A28',
  background: '#F8F3F1',   // Warm Cream
  surface: '#FFFFFF',
  text: '#374652',         // Dark Slate
  textSecondary: '#7A8690',
  textMuted: '#989EA4',    // Soft Gray
  border: '#E8E4E1',
  accent: '#FEF0EC',       // Light Saffron
  terracotta: '#D08465',   // Warm Terracotta
  coral: '#EB9C8C',        // Soft Coral
  error: '#991B1B',
  success: '#166534',
};
