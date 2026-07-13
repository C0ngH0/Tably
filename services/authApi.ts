import { API_BASE_URL } from "./apiConfig";

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

export type PasswordResetResponse = {
  message: string;
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
      `Could not reach the SplitSnap API at ${API_BASE_URL}. Please check your connection and try again.`,
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

async function submitPasswordResetRequest(
  path: "forgot-password" | "reset-password",
  body: Record<string, string>,
): Promise<PasswordResetResponse> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_ENDPOINT}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[authApi] Password reset request failed:", error);
    throw new Error(
      `Could not reach the SplitSnap API at ${API_BASE_URL}. Please check your connection and try again.`,
    );
  }

  if (!response.ok) {
    let message = `Password reset request failed (${response.status}).`;

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
    return (await response.json()) as PasswordResetResponse;
  } catch {
    throw new Error("Server returned an unreadable password reset response.");
  }
}

export function requestPasswordReset(
  email: string,
): Promise<PasswordResetResponse> {
  return submitPasswordResetRequest("forgot-password", { email });
}

export function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<PasswordResetResponse> {
  return submitPasswordResetRequest("reset-password", {
    email,
    code,
    newPassword,
  });
}
