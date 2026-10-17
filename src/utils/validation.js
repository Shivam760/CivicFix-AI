/**
 * src/utils/validation.js
 * Centralized, production-grade validation utilities for CivicFix AI authentication.
 */

// Basic email regex following RFC 5322 simplified standard
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

// Phone number regex supporting international and national formats (digits, spaces, hyphens, optional +)
export const PHONE_REGEX = /^\+?[0-9\s\-()]{7,15}$/;

/**
 * Validates an email address.
 * @param {string} email
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required.' };
  }
  const cleanEmail = email.trim();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g., citizen@example.com).' };
  }
  return { isValid: true };
}

/**
 * Validates a password for Login.
 * @param {string} password
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateLoginPassword(password) {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  return { isValid: true };
}

/**
 * Validates a phone number for Sign-Up.
 * @param {string} phone
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validatePhoneNumber(phone) {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required.' };
  }
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Please enter a valid phone number with at least 10 digits.' };
  }
  if (!PHONE_REGEX.test(phone.trim())) {
    return { isValid: false, error: 'Please enter a valid phone number.' };
  }
  return { isValid: true };
}

/**
 * Evaluates password strength and criteria for Sign-Up.
 * @param {string} password
 * @returns {{
 *   score: number, // 0 to 4
 *   label: 'Weak' | 'Fair' | 'Good' | 'Strong',
 *   color: string,
 *   hasMinLength: boolean,
 *   hasLetter: boolean,
 *   hasNumber: boolean,
 *   hasSpecial: boolean,
 *   isValid: boolean,
 *   error?: string
 * }}
 */
export function evaluatePasswordStrength(password = '') {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let score = 0;
  if (password.length >= 6) score++;
  if (hasMinLength && hasLetter) score++;
  if (hasNumber) score++;
  if (hasSpecial && password.length >= 10) score++;

  let label = 'Weak';
  let color = '#EF4444'; // Red

  if (score === 2) {
    label = 'Fair';
    color = '#F59E0B'; // Amber
  } else if (score === 3) {
    label = 'Good';
    color = '#10B981'; // Emerald
  } else if (score >= 4) {
    label = 'Strong';
    color = '#059669'; // Deep Green
  }

  let error;
  if (!password) {
    error = 'Password is required.';
  } else if (!hasMinLength) {
    error = 'Password must be at least 8 characters long.';
  } else if (!hasLetter || !hasNumber) {
    error = 'Password must include both letters and numbers.';
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
    isValid: hasMinLength && hasLetter && hasNumber,
    error,
  };
}
