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

export function clearAuthData() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
    } catch (err) {
      console.warn('Failed to clear localStorage during logout', err);
    }
  }

  if (typeof document === 'undefined') return;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const domainParts = hostname.split('.').filter(Boolean);

  // Collect domain permutations so we clear shared cookies set on parent domains.
  const domainOptions = new Set(['']);
  if (hostname) {
    domainOptions.add(hostname);
  }

  for (let i = 0; i < domainParts.length - 1; i += 1) {
    const domain = domainParts.slice(i).join('.');
    domainOptions.add(domain);
    domainOptions.add(`.${domain}`);
  }

  domainOptions.forEach((domain) => {
    const domainAttr = domain ? ` domain=${domain};` : '';
    document.cookie = `authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domainAttr}`;
  });
}

export const cleanJsonTheme = (payload) => {
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return null;
  }
};
