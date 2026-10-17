/**
 * src/api/authApi.js
 * 
 * Centralized Authentication API adapter for CivicFix AI.
 * Re-exports the unified implementation from src/services/apiClient.js.
 */

export {
  API_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  HEALTH_TIMEOUT_MS,
  authStorage,
  resetCircuitBreaker,
  apiRequest,
  checkBackendHealth,
  loginUser,
  registerUser,
  requestPasswordReset,
} from '../services/apiClient';
