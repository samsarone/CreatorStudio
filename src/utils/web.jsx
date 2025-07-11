// helpers/auth.jsx

export function getAuthToken() {
  // 1. localStorage (fast path)
  const fromStorage =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (fromStorage) return fromStorage;

  // 2. Cookie fallback
  if (typeof document === 'undefined') return null; // SSR guard
  const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]+)/);
  if (!match) return null;

  const token = decodeURIComponent(match[1]);

  // 3. Cache into localStorage for next time
  try {
    localStorage.setItem('authToken', token);
  } catch {
    /* ignore quota / private‑mode errors */
  }
  return token;
}

export function getHeaders() {
  const token = getAuthToken();

  if (!token) return;
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
}

export const cleanJsonTheme = (payload) => {
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return null;
  }
};
