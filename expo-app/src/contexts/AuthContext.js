import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

/**
 * AuthContext — mobile user authentication state.
 *
 * Lifecycle:
 *   - On mount: try to load cached token, hit /auth/mobile/me to validate
 *   - login/signup methods set the user + token
 *   - logout clears AsyncStorage
 *
 * `bootstrapping` is true while we check the cached token; the App should
 * render a splash/loader instead of either Auth or Tabs during this time.
 */

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = '@sanatan_token';
const USER_KEY = '@sanatan_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        setUser(null);
        return;
      }
      // Try the mobile /me endpoint first — if it works we have a valid mobile user
      try {
        const me = await api.mobileMe();
        if (me && me.role === 'user') {
          setUser(me);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
          return;
        }
      } catch { /* fallthrough — token may be admin or invalid */ }
      // Token may be the admin auto-login token from the older flow — clear it
      // so the user lands on the Login screen and can create a real account.
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      setUser(null);
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = useCallback(async ({ email, password }) => {
    const data = await api.mobileLogin({ email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async ({ name, email, password, phone }) => {
    const data = await api.mobileSignup({ name, email, password, phone });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore — we'll wipe locally anyway */ }
    setUser(null);
  }, []);

  /** Update the signed-in user's preferred content language. Persists on the
   *  backend (app_users.preferred_language) and updates local state so screens
   *  re-render with the new language immediately. */
  const updatePreferredLanguage = useCallback(async (lang) => {
    const next = await api.mobileUpdateSettings({ preferred_language: lang });
    setUser((u) => {
      const merged = { ...(u || {}), preferred_language: next.preferred_language || lang };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
    return lang;
  }, []);

  const value = { user, bootstrapping, login, signup, logout, refresh: bootstrap, updatePreferredLanguage };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
