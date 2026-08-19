/**
 * Material Design 3 Expressive (M3 Expressive) Web Library
 * Security & Sanitization Utilities
 *
 * Provides XSS mitigation, HTML escaping, and safe attribute sanitizers.
 */

/**
 * Escapes unsafe HTML characters in a string to prevent XSS.
 * @param {any} val
 * @returns {string}
 */
export function escapeHtml(val) {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes attribute values removing quotes and angle brackets.
 * @param {any} val
 * @returns {string}
 */
export function sanitizeAttribute(val) {
  if (val == null) return '';
  return String(val).replace(/["'<>]/g, '');
}

/**
 * Safely parses JSON string with fallback, ensuring array/object structure without prototype pollution.
 * @param {string|null} raw
 * @param {any} fallback
 * @returns {any}
 */
export function safeJsonParse(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return fallback;
    }
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
    return parsed;
  } catch (_) {
    return fallback;
  }
}
