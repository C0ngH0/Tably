import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SplitSession } from "../types/split";

const SAVED_SPLITS_KEY = "splitsnap:saved-splits";

function sortByUpdatedAtDesc(sessions: SplitSession[]) {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getSavedSplitSessions(): Promise<SplitSession[]> {
  const rawValue = await AsyncStorage.getItem(SAVED_SPLITS_KEY);

  if (!rawValue) {
    console.log("[splitStorage] No saved sessions found");
    return [];
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  const sessions = sortByUpdatedAtDesc(parsed as SplitSession[]);
  console.log("[splitStorage] Loaded saved sessions:", sessions.length);
  return sessions;
}

export async function saveSplitSession(session: SplitSession): Promise<void> {
  console.log("[splitStorage] Saving session:", {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
  const sessions = await getSavedSplitSessions();
  const nextSessions = sortByUpdatedAtDesc([
    session,
    ...sessions.filter((savedSession) => savedSession.id !== session.id),
  ]);

  await AsyncStorage.setItem(SAVED_SPLITS_KEY, JSON.stringify(nextSessions));
  console.log("[splitStorage] Saved session count:", nextSessions.length);
}

export async function deleteSplitSession(sessionId: string): Promise<void> {
  const sessions = await getSavedSplitSessions();
  const nextSessions = sessions.filter((session) => session.id !== sessionId);

  await AsyncStorage.setItem(SAVED_SPLITS_KEY, JSON.stringify(nextSessions));
}

export async function clearAllSplitSessions(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_SPLITS_KEY);
}
