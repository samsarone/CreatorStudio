const AUTH_COOKIE_NAME = 'authToken';
const AUTH_TOKEN_KEY = 'authToken';
const COOKIE_CONSENT_KEY = 'samsar_cookie_consent';
let inMemoryAuthToken = null;

const expireAuthCookie = (domain) => {
  if (typeof document === 'undefined') return;
  const domainAttr = domain ? ` domain=${domain};` : '';
  document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domainAttr}`;
};

export function clearAuthCookies() {
  // Clear any legacy auth cookies that may still be present.
  if (typeof document === 'undefined') return;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const domainParts = hostname ? hostname.split('.').filter(Boolean) : [];

  const domainOptions = new Set(['']);
  if (hostname) domainOptions.add(hostname);
  if (hostname && hostname.includes('samsar.one')) domainOptions.add('.samsar.one');

  for (let i = 0; i < domainParts.length - 1; i += 1) {
    const domain = domainParts.slice(i).join('.');
    domainOptions.add(domain);
    domainOptions.add(`.${domain}`);
  }

  domainOptions.forEach(expireAuthCookie);
}

export function getCookieConsentStatus() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
}

export function hasAcceptedCookies() {
  return getCookieConsentStatus() === 'accepted';
}

export function saveCookieConsentStatus(status) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, status);
  } catch (e) {
    // Ignore storage errors when persisting cookie consent.
  }

  if (status === 'rejected') {
    clearAuthCookies();
  }
}

// helpers/auth.jsx

export function getAuthToken() {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  if (typeof window === 'undefined') return null;

  try {
    const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (sessionToken) {
      inMemoryAuthToken = sessionToken;
      return sessionToken;
    }

    // Migrate any legacy localStorage token into sessionStorage, then remove it.
    const legacyToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (legacyToken) {
      inMemoryAuthToken = legacyToken;
      sessionStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return legacyToken;
    }
  } catch (err) {
    // Ignore storage read errors to avoid breaking auth flow.
  }

  return null;
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

export function persistAuthToken(token) {
  if (!token || typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (err) {
    // Ignore storage write errors; token will only live in memory.
  }

  inMemoryAuthToken = token;
}

export function clearAuthData() {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (err) {
      // Ignore storage clear errors.
    }

    // Clear any legacy storage locations that may still hold the token.
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (err) {
      // Ignore storage clear errors.
    }
  }

  inMemoryAuthToken = null;
  clearAuthCookies();
}

export const cleanJsonTheme = (payload) => {
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return null;
  }
};
