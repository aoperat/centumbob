// Korean timezone date utilities

/**
 * Get current date in Korean timezone (Asia/Seoul)
 * @returns {Date} Date object adjusted to Korean time
 */
export function getKoreanDate() {
  const now = new Date();
  // Convert to Korean timezone
  const koreanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return koreanTime;
}

/**
 * Get today's date string in YYYY-MM-DD format (Korean timezone)
 * @returns {string} Date string like "2024-01-15"
 */
export function getKoreanDateString() {
  const korean = getKoreanDate();
  const year = korean.getFullYear();
  const month = String(korean.getMonth() + 1).padStart(2, '0');
  const day = String(korean.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Korean day of week
 * @returns {string} Korean day like "월", "화", etc.
 */
export function getKoreanDayOfWeek() {
  const korean = getKoreanDate();
  const dayIndex = korean.getDay();
  const dayMap = ['일', '월', '화', '수', '목', '금', '토'];
  return dayMap[dayIndex];
}

/**
 * Check if today is a weekday (Monday-Friday)
 * @returns {boolean}
 */
export function isWeekday() {
  const day = getKoreanDayOfWeek();
  return !['토', '일'].includes(day);
}

/**
 * Format a date string to Korean display format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date like "1월 15일 (월)"
 */
export function formatKoreanDate(dateString) {
  const date = new Date(dateString + 'T00:00:00+09:00');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayIndex = date.getDay();
  const dayMap = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}월 ${day}일 (${dayMap[dayIndex]})`;
}

/**
 * Get relative time string in Korean
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time like "방금 전", "5분 전", "1시간 전"
 */
export function getRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  // More than a week, show actual date
  const month = past.getMonth() + 1;
  const day = past.getDate();
  return `${month}/${day}`;
}
