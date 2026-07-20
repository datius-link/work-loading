import React, { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { clearOfflineCache } from "./offlineCache";

export const USER_SESSION_KEYS = {
  token: "user_token",
  user: "user_account",
  profile: "user_profile",
  email: "user_email",
};

// If "Nikumbuke" (remember me) was left unchecked at login, we still persist
// the session normally so the rest of the app works this run — but we flag
// it as ephemeral. consumeEphemeralSessionIfAny() is called once at app cold
// start (App.js) and wipes any session left flagged this way, so an
// un-remembered login doesn't survive closing/reopening the app.
const EPHEMERAL_FLAG_KEY = "user_session_ephemeral";

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

export async function saveUserSession({ token, user, viewer, email, remember = true }) {
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
  if (remember) {
    await AsyncStorage.removeItem(EPHEMERAL_FLAG_KEY);
  } else {
    await AsyncStorage.setItem(EPHEMERAL_FLAG_KEY, "1");
  }
  const saved = await getUserSession();
  cachedUserSession = saved;
  notifyUserSession(saved);
  return saved;
}

// Called once at app cold start (App.js), before anything else reads the
// session. If the last login had "Nikumbuke" unchecked, this wipes it so the
// user lands back on the login screen instead of silently staying signed in.
export async function consumeEphemeralSessionIfAny() {
  try {
    const flag = await AsyncStorage.getItem(EPHEMERAL_FLAG_KEY);
    if (flag !== "1") return false;
    await clearUserSession();
    return true;
  } catch (_err) {
    return false;
  }
}

export async function clearUserSession() {
  await AsyncStorage.multiRemove([...Object.values(USER_SESSION_KEYS), EPHEMERAL_FLAG_KEY]);
  // Cache keys like "posts:me"/"hiring:my-jobs" aren't scoped per-account —
  // without this, a different account logging in on the same device would
  // briefly see the previous account's cached feed/jobs/profile before the
  // real fetch corrects it.
  await clearOfflineCache();
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
