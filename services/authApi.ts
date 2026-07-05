import { API_BASE_URL } from "./receiptExtraction";

const AUTH_ENDPOINT = `${API_BASE_URL}/api/auth`;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

async function submitAuthRequest(
  path: "register" | "login",
  email: string,
  password: string,
): Promise<AuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_ENDPOINT}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error("[authApi] Network request failed:", error);
    throw new Error(
      `Could not reach the SplitSnap server at ${API_BASE_URL}. Make sure the backend is running and your phone is on the same Wi-Fi network.`,
    );
  }

  if (!response.ok) {
    let message = `Authentication failed (${response.status}).`;

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

  try {
    return (await response.json()) as AuthResponse;
  } catch {
    throw new Error("Server returned an unreadable authentication response.");
  }
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return submitAuthRequest("register", email, password);
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return submitAuthRequest("login", email, password);
}
