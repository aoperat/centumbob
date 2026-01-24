// Anonymous user ID management for chat
const ANONYMOUS_ID_KEY = 'centumbob_anonymous_id';

/**
 * Get or create anonymous ID for non-logged-in users
 * Format: "익명_XXXXXX" (6-digit random number)
 * @returns {string} The anonymous display name
 */
export function getAnonymousId() {
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    // Generate 6-digit random number
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    anonymousId = `익명_${randomNum}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }

  return anonymousId;
}

/**
 * Clear anonymous ID (for testing purposes)
 */
export function clearAnonymousId() {
  localStorage.removeItem(ANONYMOUS_ID_KEY);
}
