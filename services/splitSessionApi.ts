import { API_BASE_URL } from "./receiptExtraction";
import { getStoredAuthToken } from "./authStorage";
import type {
  CreateSplitSessionRequest,
  SplitSessionDto,
  UpdateSplitSessionRequest,
} from "../shared/types/splitSession";

const SPLIT_SESSIONS_ENDPOINT = `${API_BASE_URL}/api/split-sessions`;

type SplitSessionsResponse = {
  splitSessions: SplitSessionDto[];
};

type SplitSessionResponse = {
  splitSession: SplitSessionDto;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Server returned an unreadable response.");
  }
}

async function getAuthHeaders(extraHeaders?: HeadersInit): Promise<HeadersInit> {
  const token = await getStoredAuthToken();

  if (!token) {
    throw new Error("Please log in before using saved splits.");
  }

  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  const headers = await getAuthHeaders(options?.headers);

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("[splitSessionApi] Network request failed:", url, error);
    throw new Error(
      `Could not reach the SplitSnap server at ${API_BASE_URL}. Make sure the backend is running and your phone is on the same Wi-Fi network.`,
    );
  }

  if (!response.ok) {
    let message = `Split session request failed (${response.status}).`;

    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch {
      // Keep the generic HTTP message when the server does not return JSON.
    }

    throw new Error(message);
  }

  return parseJsonResponse<T>(response);
}

async function jsonRequestOptions(
  method: "POST" | "PUT",
  body: CreateSplitSessionRequest | UpdateSplitSessionRequest,
): Promise<RequestInit> {
  return {
    method,
    headers: await getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  };
}

export async function getSplitSessions(): Promise<SplitSessionDto[]> {
  const response = await request<SplitSessionsResponse>(SPLIT_SESSIONS_ENDPOINT);
  return response.splitSessions;
}

export async function getSplitSession(id: string): Promise<SplitSessionDto> {
  const response = await request<SplitSessionResponse>(
    `${SPLIT_SESSIONS_ENDPOINT}/${encodeURIComponent(id)}`,
  );
  return response.splitSession;
}

export async function createSplitSession(
  session: CreateSplitSessionRequest,
): Promise<SplitSessionDto> {
  const response = await request<SplitSessionResponse>(
    SPLIT_SESSIONS_ENDPOINT,
    await jsonRequestOptions("POST", session),
  );

  return response.splitSession;
}

export async function updateSplitSession(
  id: string,
  session: UpdateSplitSessionRequest,
): Promise<SplitSessionDto> {
  const response = await request<SplitSessionResponse>(
    `${SPLIT_SESSIONS_ENDPOINT}/${encodeURIComponent(id)}`,
    await jsonRequestOptions("PUT", session),
  );

  return response.splitSession;
}

export async function deleteSplitSession(id: string): Promise<void> {
  let response: Response;
  const url = `${SPLIT_SESSIONS_ENDPOINT}/${encodeURIComponent(id)}`;

  try {
    response = await fetch(url, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
  } catch (error) {
    console.error("[splitSessionApi] Network request failed:", url, error);
    throw new Error(
      `Could not reach the SplitSnap server at ${API_BASE_URL}. Make sure the backend is running and your phone is on the same Wi-Fi network.`,
    );
  }

  if (!response.ok) {
    let message = `Split session delete failed (${response.status}).`;

    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch {
      // Keep the generic HTTP message when the server does not return JSON.
    }

    throw new Error(message);
  }
}
