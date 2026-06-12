import React, { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export const USER_SESSION_KEYS = {
  token: "user_token",
  user: "user_account",
  profile: "user_profile",
  email: "user_email",
};

let cachedUserSession = null;
const userSessionListeners = new Set();

function parseStoredJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function notifyUserSession(session) {
  userSessionListeners.forEach((listener) => {
    try {
      listener(session);
    } catch (_) {}
  });
}

export function subscribeUserSession(listener) {
  userSessionListeners.add(listener);
  return () => userSessionListeners.delete(listener);
}

export async function getUserSession() {
  const [token, userJson, profileJson, legacyEmail] = await AsyncStorage.multiGet([
    USER_SESSION_KEYS.token,
    USER_SESSION_KEYS.user,
    USER_SESSION_KEYS.profile,
    USER_SESSION_KEYS.email,
  ]).then((pairs) => pairs.map((pair) => pair[1]));

  if (!token) {
    cachedUserSession = null;
    return {
      token: null,
      user: null,
      profile: null,
      email: null,
      isLoggedIn: false,
    };
  }

  const user = parseStoredJson(userJson);
  const profile = parseStoredJson(profileJson) || user;
  const viewer = user || profile;
  const email = viewer?.email || profile?.email || legacyEmail || null;

  const session = {
    token: token || null,
    user: viewer,
    profile,
    email,
    isLoggedIn: !!token,
  };

  cachedUserSession = session;

  return session;
}

export async function getUserToken() {
  if (cachedUserSession?.token) {
    return cachedUserSession.token;
  }
  return AsyncStorage.getItem(USER_SESSION_KEYS.token);
}

export async function saveUserSession({ token, user, viewer, email }) {
  if (!token) return null;

  const account = user || viewer || null;
  const normalizedEmail = account?.email || email || null;
  const storedUser = account || (normalizedEmail ? { email: normalizedEmail } : {});
  const entries = [
    [USER_SESSION_KEYS.token, token],
    [USER_SESSION_KEYS.user, JSON.stringify(storedUser)],
    [USER_SESSION_KEYS.profile, JSON.stringify(storedUser)],
  ];

  if (normalizedEmail) {
    entries.push([USER_SESSION_KEYS.email, normalizedEmail]);
  }

  await AsyncStorage.multiSet(entries);
  const saved = await getUserSession();
  cachedUserSession = saved;
  notifyUserSession(saved);
  return saved;
}

export async function clearUserSession() {
  await AsyncStorage.multiRemove(Object.values(USER_SESSION_KEYS));
  cachedUserSession = null;
  notifyUserSession({
    token: null,
    user: null,
    profile: null,
    email: null,
    isLoggedIn: false,
  });
}

export function useUserSession() {
  const [session, setSession] = useState({
    token: null,
    user: null,
    profile: null,
    email: null,
    isLoggedIn: false,
    loaded: false,
  });

  const refresh = useCallback(async () => {
    const nextSession = await getUserSession();
    setSession({ ...nextSession, loaded: true });
    return nextSession;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeUserSession((nextSession) => {
        setSession({ ...nextSession, loaded: true });
      });
      refresh();
      return unsubscribe;
    }, [refresh])
  );

  const clearSession = useCallback(async () => {
    await clearUserSession();
    setSession({
      token: null,
      user: null,
      profile: null,
      email: null,
      isLoggedIn: false,
      loaded: true,
    });
  }, []);

  return { ...session, refresh, clearSession };
}
