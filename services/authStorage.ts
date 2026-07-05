const AUTH_TOKEN_KEY = "splitsnap:auth-token";

let memoryToken: string | null = null;

function getLocalStorage(): Storage | null {
  if (
    typeof globalThis !== "undefined" &&
    "localStorage" in globalThis &&
    globalThis.localStorage
  ) {
    return globalThis.localStorage;
  }

  return null;
}

export async function getStoredAuthToken(): Promise<string | null> {
  const storage = getLocalStorage();
  if (storage) {
    return storage.getItem(AUTH_TOKEN_KEY);
  }

  return memoryToken;
}

export async function storeAuthToken(token: string): Promise<void> {
  memoryToken = token;

  const storage = getLocalStorage();
  if (storage) {
    storage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export async function clearAuthToken(): Promise<void> {
  memoryToken = null;

  const storage = getLocalStorage();
  if (storage) {
    storage.removeItem(AUTH_TOKEN_KEY);
  }
}
