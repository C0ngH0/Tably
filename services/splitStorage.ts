import type { SplitSession } from "../types/split";
import {
  createSplitSession,
  deleteSplitSession as deleteSplitSessionFromApi,
  getSplitSessions,
  updateSplitSession,
} from "./splitSessionApi";
import {
  apiDtoToSplitSession,
  splitSessionToCreateRequest,
  splitSessionToUpdateRequest,
} from "./splitSessionMapper";

function sortByUpdatedAtDesc(sessions: SplitSession[]) {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getSavedSplitSessions(): Promise<SplitSession[]> {
  return sortByUpdatedAtDesc(
    (await getSplitSessions()).map(apiDtoToSplitSession),
  );
}

export async function saveSplitSession(
  session: SplitSession,
): Promise<SplitSession> {
  const savedDto = isUuid(session.id)
    ? await updateSplitSession(session.id, splitSessionToUpdateRequest(session))
    : await createSplitSession(splitSessionToCreateRequest(session));

  return apiDtoToSplitSession(savedDto);
}

export async function deleteSplitSession(sessionId: string): Promise<void> {
  await deleteSplitSessionFromApi(sessionId);
}

export async function clearAllSplitSessions(): Promise<void> {
  const sessions = await getSavedSplitSessions();
  await Promise.all(sessions.map((session) => deleteSplitSession(session.id)));
}
