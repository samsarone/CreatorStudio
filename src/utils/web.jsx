const AUTH_COOKIE_NAME = 'authToken';
const COOKIE_CONSENT_KEY = 'samsar_cookie_consent';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getCookieDomain() {
  if (typeof window === 'undefined') return '';
  const { hostname } = window.location;
  return hostname.includes('samsar.one') ? '.samsar.one' : '';
}

function expireAuthCookie(domain) {
  if (typeof document === 'undefined') return;
  const domainAttr = domain ? ` domain=${domain};` : '';
  document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${domainAttr}`;
}

export function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const domainParts = hostname ? hostname.split('.').filter(Boolean) : [];

  const domainOptions = new Set(['']);
  if (hostname) {
    domainOptions.add(hostname);
  }
  if (hostname && hostname.includes('samsar.one')) {
    domainOptions.add('.samsar.one');
  }

  for (let i = 0; i < domainParts.length - 1; i += 1) {
    const domain = domainParts.slice(i).join('.');
    domainOptions.add(domain);
    domainOptions.add(`.${domain}`);
  }

  domainOptions.forEach((domain) => {
    expireAuthCookie(domain);
  });
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
    console.warn('Unable to store cookie consent preference', e);
  }

  if (status === 'rejected') {
    clearAuthCookies();
  }
}

export function setAuthCookieIfConsented(token) {
  if (!token || typeof document === 'undefined') return;

  if (!hasAcceptedCookies()) {
    clearAuthCookies();
    return;
  }

  const sharedDomain = getCookieDomain();
  const domainAttr = sharedDomain ? `; domain=${sharedDomain}` : '';
  const secureAttr =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureAttr}${domainAttr}`;
}

// helpers/auth.jsx

export function getAuthToken() {
  // 1. localStorage (fast path)
  const fromStorage =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (fromStorage) return fromStorage;

  // 2. Cookie fallback
  if (typeof document === 'undefined') return null; // SSR guard
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`)
  );
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

export function persistAuthToken(token) {
  if (!token || typeof window === 'undefined') return;

  try {
    localStorage.setItem('authToken', token);
  } catch (err) {
    console.warn('Unable to store auth token in localStorage', err);
  }

  setAuthCookieIfConsented(token);
}

export function clearAuthData() {
  if (typeof window !== 'undefined') {
    let consentStatus = null;
    try {
      consentStatus = localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch (err) {
      console.warn('Unable to read cookie consent status before clearing storage', err);
    }

    try {
      localStorage.clear();
    } catch (err) {
      console.warn('Failed to clear localStorage during logout', err);
    }

    if (consentStatus) {
      try {
        localStorage.setItem(COOKIE_CONSENT_KEY, consentStatus);
      } catch (err) {
        console.warn('Failed to restore cookie consent preference', err);
      }
    }
    try {
      sessionStorage.removeItem('authToken');
    } catch (err) {
      console.warn('Failed to clear sessionStorage during logout', err);
    }
  }

  clearAuthCookies();
}

export const cleanJsonTheme = (payload) => {
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return null;
  }
};
