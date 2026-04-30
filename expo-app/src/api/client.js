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

async function mobileSignup({ name, email, password, phone }) {
  const { data } = await axios.post(`${API_BASE_URL}/auth/mobile/signup`, {
    name, email, password, phone,
  });
  if (data.token) {
    await saveToken(data.token);
    if (data.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data;
}

async function mobileLogin({ email, password }) {
  const { data } = await axios.post(`${API_BASE_URL}/auth/mobile/login`, { email, password });
  if (data.token) {
    await saveToken(data.token);
    if (data.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data;
}

// Add token header
client.interceptors.request.use(async (config) => {
  const t = await loadToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// On 401, clear the local token so the AuthProvider can react and bounce the
// user to the Login screen. (Earlier this auto-retried with admin creds — that
// would silently downgrade a real user session into an admin one, which is a
// security bug. Fixed in Session 13.)
client.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      await saveToken(null);
      await AsyncStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

// ---- Public API methods ----
export const api = {
  // Public (no auth)
  getPanchangToday: (lat = null, lon = null, tz = null) => {
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', lat);
    if (lon != null) params.append('lon', lon);
    if (tz)  params.append('tz', tz);
    const qs = params.toString();
    return axios.get(`${API_BASE_URL}/mobile/panchang/today${qs ? '?' + qs : ''}`).then(r => r.data);
  },
  getPanchangDay: ({ lat = 28.6139, lon = 77.2090, tz = 'Asia/Kolkata', date = null, system = 'north' } = {}) => {
    const params = new URLSearchParams({ lat, lon, tz, system });
    if (date) params.append('date', date);
    return axios.get(`${API_BASE_URL}/panchang/day?${params}`).then(r => r.data);
  },
  getDharmaToday: ({ lat = 28.6139, lon = 77.2090, tz = 'Asia/Kolkata', system = 'north' } = {}) => {
    const params = new URLSearchParams({ lat, lon, tz, system });
    return client.get(`/dharma/today?${params}`).then(r => r.data);
  },
  getMantraOfDay: () => axios.get(`${API_BASE_URL}/mobile/mantra-of-day`).then(r => r.data),
  // Content (no auth)
  listGranthBooks: () => axios.get(`${API_BASE_URL}/granth/books`).then(r => r.data),
  getGranthHierarchy: (bookId) => axios.get(`${API_BASE_URL}/granth/hierarchy/${bookId}`).then(r => r.data),
  getGranthChapterVerses: (chapterId, lang = 'hi') => axios.get(`${API_BASE_URL}/granth/chapter-verses/${chapterId}?lang=${lang}`).then(r => r.data),
  listVedaBooks: () => axios.get(`${API_BASE_URL}/vedas/books`).then(r => r.data),
  getVedaHierarchy: (bookId) => axios.get(`${API_BASE_URL}/vedas/hierarchy/${bookId}`).then(r => r.data),
  getVedaChapterVerses: (chapterId, lang = 'hi') => axios.get(`${API_BASE_URL}/vedas/chapter-verses/${chapterId}?lang=${lang}`).then(r => r.data),
  // Audio sync (public)
  getItemAudio: (itemId) => axios.get(`${API_BASE_URL}/content/items/${itemId}/audio`).then(r => r.data),
  // Yogas (auth)
  detectYogas: () => client.get('/yogas').then(r => r.data),
  // Mobile auth
  mobileSignup,
  mobileLogin,
  mobileMe: () => client.get('/auth/mobile/me').then(r => r.data),

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
  logout: async () => {
    try { await client.post('/auth/mobile/logout'); } catch { /* ignore */ }
    await saveToken(null);
    await AsyncStorage.removeItem(USER_KEY);
  },
  getStoredUser: async () => {
    const s = await AsyncStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  },
};

export default api;
