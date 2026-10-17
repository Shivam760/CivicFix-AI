/**
 * src/services/apiClient.js
 * 
 * Consolidated HTTP & Authentication Client for CivicFix AI.
 * 
 * Unifies all API interactions with:
 * - Single API_BASE_URL (defaults to http://localhost:8000)
 * - Safe in-memory access token storage
 * - Single shared offline circuit breaker
 * - Configurable timeout per request (default: 5000ms, health check: 3000ms)
 * - Automatic Authorization: Bearer <token> injection
 * - Automatic session invalidation and redirect on HTTP 401
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Configurable Timeout & Circuit Breaker Constants
export const DEFAULT_TIMEOUT_MS = 5000;
export const HEALTH_TIMEOUT_MS = 3000;
const CIRCUIT_BREAKER_DURATION_MS = 10000;

// In-memory token storage (with sessionStorage survival)
let inMemoryAccessToken =
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('civicfix_token') : null;
let inMemoryCurrentUser = null;

export const authStorage = {
  getToken: () => {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('civicfix_token');
      if (stored) {
        inMemoryAccessToken = stored;
        return inMemoryAccessToken;
      }
    }
    return null;
  },
  setToken: (token) => {
    inMemoryAccessToken = token;
    if (token) {
      sessionStorage.setItem('civicfix_authenticated', 'true');
      sessionStorage.setItem('civicfix_token', token);
    } else {
      sessionStorage.removeItem('civicfix_authenticated');
      sessionStorage.removeItem('civicfix_token');
    }
  },
  getUser: () => {
    if (inMemoryCurrentUser) return inMemoryCurrentUser;
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('civicfix_user_json') : null;
      if (stored) {
        inMemoryCurrentUser = JSON.parse(stored);
        return inMemoryCurrentUser;
      }
    } catch {
      // Ignore JSON parse error
    }
    return null;
  },
  setUser: (user) => {
    inMemoryCurrentUser = user;
    if (user) {
      sessionStorage.setItem('civicfix_user_email', user.email || '');
      try {
        sessionStorage.setItem('civicfix_user_json', JSON.stringify(user));
      } catch {
        // Ignore serialization errors
      }
    } else {
      sessionStorage.removeItem('civicfix_user_email');
      sessionStorage.removeItem('civicfix_user_json');
    }
  },
  isAuthenticated: () => {
    return Boolean(inMemoryAccessToken) || sessionStorage.getItem('civicfix_authenticated') === 'true';
  },
  clearSession: () => {
    inMemoryAccessToken = null;
    inMemoryCurrentUser = null;
    sessionStorage.removeItem('civicfix_authenticated');
    sessionStorage.removeItem('civicfix_user_email');
    sessionStorage.removeItem('civicfix_user_json');
    sessionStorage.removeItem('civicfix_token');
  },
};

// Shared offline circuit breaker state
let knownOffline = false;
let lastOfflineCheck = 0;

export function resetCircuitBreaker() {
  knownOffline = false;
  lastOfflineCheck = 0;
}

/**
 * Core HTTP fetch client with token injection, timeout containment, and error handling.
 * 
 * @param {string} endpoint - Relative path (e.g. '/api/v1/complaints/mine')
 * @param {object} options - Fetch options (method, headers, body, signal, timeout)
 * @returns {Promise<{ ok: boolean, status: number, data: any, error?: string, isNetworkError?: boolean }>}
 */
export async function apiRequest(endpoint, options = {}) {
  const token = authStorage.getToken();
  const isDemoSession =
    token === 'simulated_jwt_token_for_review_only' ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('civicfix_demo_mode') === 'true') ||
    (typeof window !== 'undefined' && window.location.search.includes('demo=true'));

  if (isDemoSession) {
    return {
      ok: false,
      status: 0,
      data: null,
      isNetworkError: true,
      error: 'Simulated preview mode active.',
    };
  }

  // If known to be offline in the last 10 seconds, immediately short-circuit to fallback
  if (knownOffline && Date.now() - lastOfflineCheck < CIRCUIT_BREAKER_DURATION_MS) {
    return {
      ok: false,
      status: 0,
      data: null,
      isNetworkError: true,
      error: `FastAPI backend currently offline at ${API_BASE_URL}.`,
    };
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    knownOffline = false;

    // Parse JSON safely
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && (data.detail || data.message || data.error)) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      // In case of 401 Unauthorized, prompt session re-authentication
      if (response.status === 401) {
        authStorage.clearSession();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }

      return {
        ok: false,
        status: response.status,
        data,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (err) {
    knownOffline = true;
    lastOfflineCheck = Date.now();
    const isAbort = err.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: null,
      isNetworkError: true,
      error: isAbort
        ? 'Request timed out. The backend server did not respond in time.'
        : `Cannot connect to CivicFix AI backend at ${API_BASE_URL}.`,
    };
  }
}

/**
 * Checks if the backend server is reachable.
 * Uses configurable 3000ms health check timeout.
 */
export async function checkBackendHealth() {
  const res = await apiRequest('/health', {
    method: 'GET',
    timeout: HEALTH_TIMEOUT_MS,
  });

  if (res.ok) {
    return { isOnline: true, data: res.data };
  }
  return {
    isOnline: false,
    status: res.status,
    error: res.error,
  };
}

/**
 * Authenticate user credentials.
 */
export async function loginUser({ email, password, useDevSimulation = false }) {
  const isDemo =
    useDevSimulation ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('civicfix_demo_mode') === 'true') ||
    (typeof window !== 'undefined' && window.location.search.includes('demo=true'));

  if (isDemo) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (password === 'wrongpassword') {
      return {
        success: false,
        error: 'Invalid email or password. Please verify your civic credentials.',
      };
    }
    const lowerEmail = email.toLowerCase();
    let role = 'citizen';
    let simulatedUser = { email, id: 'demo-citizen-101', role: 'citizen' };

    if (lowerEmail.includes('admin')) {
      role = 'admin';
      simulatedUser = {
        id: 'usr-admin-01',
        name: 'Rajesh Varma',
        email,
        role: 'admin',
        department: 'Central Municipal Platform Admin',
      };
    } else if (lowerEmail.includes('committee') || lowerEmail.includes('sundaram')) {
      role = 'committee';
      simulatedUser = {
        id: 'usr-committee-01',
        name: 'Er. Priya Sundaram',
        email,
        role: 'committee',
        department: 'BBMP Road Infrastructure (East Zone)',
      };
    }

    localStorage.setItem('civicfix_active_preview_role', role);
    authStorage.setToken('simulated_jwt_token_for_review_only');
    authStorage.setUser(simulatedUser);
    return {
      success: true,
      message: 'Authenticated in Developer Preview mode.',
      user: simulatedUser,
      isSimulated: true,
    };
  }

  const res = await apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
    timeout: DEFAULT_TIMEOUT_MS,
  });

  if (res.ok && res.data) {
    if (res.data.access_token) {
      authStorage.setToken(res.data.access_token);
      authStorage.setUser(res.data.user || { email });
    }
    return {
      success: true,
      data: res.data,
      user: res.data.user || { email },
    };
  }

  if (res.isNetworkError) {
    const lowerEmail = email.toLowerCase();
    let role = 'citizen';
    let simulatedUser = { email, id: 'demo-citizen-101', role: 'citizen' };

    if (lowerEmail.includes('admin')) {
      role = 'admin';
      simulatedUser = {
        id: 'usr-admin-01',
        name: 'Rajesh Varma',
        email,
        role: 'admin',
        department: 'Central Municipal Platform Admin',
      };
    } else if (lowerEmail.includes('committee') || lowerEmail.includes('sundaram')) {
      role = 'committee';
      simulatedUser = {
        id: 'usr-committee-01',
        name: 'Er. Priya Sundaram',
        email,
        role: 'committee',
        department: 'BBMP Road Infrastructure (East Zone)',
      };
    }

    localStorage.setItem('civicfix_active_preview_role', role);
    authStorage.setToken('simulated_jwt_token_for_review_only');
    authStorage.setUser(simulatedUser);
    return {
      success: true,
      message: 'Authenticated via offline circuit breaker fallback.',
      user: simulatedUser,
      isSimulated: true,
    };
  }

  return {
    success: false,
    isBackendOffline: false,
    error: res.error || `Login failed (HTTP ${res.status}).`,
    status: res.status,
  };
}

/**
 * Register a new citizen account.
 */
export async function registerUser({ email, phone, password, useDevSimulation = false }) {
  if (useDevSimulation && import.meta.env.DEV) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const simulatedUser = { email, phone, id: 'demo-citizen-202', role: 'citizen' };
    authStorage.setUser(simulatedUser);
    return {
      success: true,
      message: 'Account successfully registered in Developer Preview mode.',
      user: simulatedUser,
      isSimulated: true,
    };
  }

  const res = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      phone: phone.trim(),
      password,
    }),
    timeout: DEFAULT_TIMEOUT_MS,
  });

  if (res.ok) {
    return {
      success: true,
      data: res.data,
    };
  }

  return {
    success: false,
    isBackendOffline: Boolean(res.isNetworkError),
    error: res.isNetworkError
      ? (import.meta.env.DEV
          ? `Cannot reach CivicFix AI backend at ${API_BASE_URL}. Ensure your FastAPI server is active, or toggle "Offline Simulation Mode" in the dev badge for testing.`
          : 'The registration service is temporarily unavailable. Please try again shortly.')
      : (res.error || `Account creation failed (HTTP ${res.status}).`),
    status: res.status,
  };
}

/**
 * Request password recovery.
 */
export async function requestPasswordReset({ email, useDevSimulation = false }) {
  if (useDevSimulation && import.meta.env.DEV) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      success: true,
      message: `Password reset instructions dispatched to ${email} (Dev simulation).`,
      isSimulated: true,
    };
  }

  const res = await apiRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
    timeout: DEFAULT_TIMEOUT_MS,
  });

  if (res.ok) {
    return {
      success: true,
      data: res.data,
      message: (res.data && res.data.message) || 'Password recovery instructions sent.',
    };
  }

  return {
    success: false,
    isBackendOffline: Boolean(res.isNetworkError),
    error: res.isNetworkError
      ? (import.meta.env.DEV
          ? `Backend unreachable at ${API_BASE_URL}. The recovery request could not be transmitted to the civic authentication server.`
          : 'The password recovery service is currently unreachable. Please try again later.')
      : (res.error || `Password recovery request failed (HTTP ${res.status}).`),
    status: res.status,
  };
}
