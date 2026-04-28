/**
 * API client for Sanatan Saathi mobile app.
 * Auto-logs in with admin credentials (or persisted token), stores via AsyncStorage.
 * All screens should use this — falls back to mock data on error.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// Default test credentials — replace with user-specific signup later
const DEFAULT_EMAIL = 'admin@sanatansaathi.com';
const DEFAULT_PASSWORD = 'SanatanAdmin@2026';

const TOKEN_KEY = '@sanatan_token';
const USER_KEY = '@sanatan_user';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

let inMemToken = null;

async function loadToken() {
  if (inMemToken) return inMemToken;
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  if (t) inMemToken = t;
  return inMemToken;
}

async function saveToken(token) {
  inMemToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function loginDefault() {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
    });
    const token = data.access_token || data.token;
    if (token) {
      await saveToken(token);
      if (data.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return token;
    }
  } catch (e) { /* ignore — caller will fallback */ }
  return null;
}

// Add token header
client.interceptors.request.use(async (config) => {
  const t = await loadToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Auto-retry on 401 with default login
client.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && !error.config.__retried) {
      error.config.__retried = true;
      const newToken = await loginDefault();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

// ---- Public API methods ----
export const api = {
  // Public (no auth)
  getPanchangToday: () => axios.get(`${API_BASE_URL}/mobile/panchang/today`).then(r => r.data),
  getMantraOfDay: () => axios.get(`${API_BASE_URL}/mobile/mantra-of-day`).then(r => r.data),
  // Content (no auth)
  listGranthBooks: () => axios.get(`${API_BASE_URL}/granth/books`).then(r => r.data),
  getGranthHierarchy: (bookId) => axios.get(`${API_BASE_URL}/granth/hierarchy/${bookId}`).then(r => r.data),
  getGranthChapterVerses: (chapterId, lang = 'hi') => axios.get(`${API_BASE_URL}/granth/chapter-verses/${chapterId}?lang=${lang}`).then(r => r.data),
  listVedaBooks: () => axios.get(`${API_BASE_URL}/vedas/books`).then(r => r.data),
  getVedaHierarchy: (bookId) => axios.get(`${API_BASE_URL}/vedas/hierarchy/${bookId}`).then(r => r.data),
  getVedaChapterVerses: (chapterId, lang = 'hi') => axios.get(`${API_BASE_URL}/vedas/chapter-verses/${chapterId}?lang=${lang}`).then(r => r.data),

  // Authenticated
  ensureLogin: async () => {
    const t = await loadToken();
    if (t) return t;
    return await loginDefault();
  },
  getInsightsToday: () => client.get('/insights/today').then(r => r.data),
  getNotificationsToday: () => client.get('/notifications/today').then(r => r.data),
  getMyKundli: () => client.get('/kundli/my').then(r => r.data),
  getCharts: () => client.get('/charts/d1-d9').then(r => r.data),
  getCurrentDasha: () => client.get('/dasha/current').then(r => r.data),
  detectDoshas: () => client.get('/dosha/detect').then(r => r.data),
  generateKundli: (payload) => client.post('/kundli/generate', payload).then(r => r.data),
  ttsSynthesize: (text, language = 'hi') => client.post('/tts/synthesize', { text: (text || '').slice(0, 4000), language }).then(r => r.data),
  vedaChat: (message, conversation_id = null) => client.post('/vedachat/message', { message, conversation_id }).then(r => r.data),

  // Auth helpers
  loginDefault,
  logout: async () => { await saveToken(null); await AsyncStorage.removeItem(USER_KEY); },
  getStoredUser: async () => {
    const s = await AsyncStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  },
};

export default api;
