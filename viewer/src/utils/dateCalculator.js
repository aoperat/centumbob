/**
 * 한국 시간 기준 주차 자동 계산 유틸리티 (클라이언트용)
 * - 토요일 자정(00:00)에 다음 주로 전환
 * - date_range 형식: "1.13-1.17" (월.일-월.일)
 */

/**
 * 해당 년도의 1월 1일이 속한 주의 월요일을 찾아서 첫 주차 시작일을 계산
 * @param {number} year - 년도
 * @returns {Date} 해당 년도의 첫 월요일
 */
function getFirstMondayOfYear(year) {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
  // 월요일(1)로 맞추기 위해 필요한 일수 계산
  const daysToAdd = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 1 - dayOfWeek;
  const firstMonday = new Date(year, 0, 1);
  firstMonday.setDate(1 + daysToAdd);
  return firstMonday;
}

/**
 * ISO 주차 계산
 * @param {Date} date - 날짜
 * @returns {number} ISO 주차 번호
 */
function getISOWeek(date) {
  const year = date.getFullYear();
  const firstMonday = getFirstMondayOfYear(year);

  // date가 첫 월요일보다 이전이면 이전 년도의 마지막 주차
  if (date < firstMonday) {
    const prevYearFirstMonday = getFirstMondayOfYear(year - 1);
    const diffMs = date - prevYearFirstMonday;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  }

  const diffMs = date - firstMonday;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/**
 * 한국 시간(KST) 기준 현재 날짜 반환
 * @returns {Date} 한국 시간 기준 현재 날짜
 */
export function getKSTNow() {
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9 in minutes
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + kstOffset * 60000);
}

/**
 * 한국 시간 기준 현재 주차 계산
 * - 토요일(6), 일요일(0)은 다음 주로 간주
 * - 월~금은 현재 주
 * @param {Date} [customDate] - 테스트용 커스텀 날짜 (선택)
 * @returns {{ year: number, week: number, dateRange: string, monday: Date, friday: Date }}
 */
export function getCurrentWeekRange(customDate = null) {
  const kstNow = customDate || getKSTNow();
  const dayOfWeek = kstNow.getDay(); // 0=일, 1=월, ..., 6=토

  // 기준 월요일 계산
  let monday = new Date(kstNow);
  monday.setHours(0, 0, 0, 0);

  if (dayOfWeek === 0) {
    // 일요일 → 다음 주 월요일 (+1)
    monday.setDate(kstNow.getDate() + 1);
  } else if (dayOfWeek === 6) {
    // 토요일 → 다음 주 월요일 (+2)
    monday.setDate(kstNow.getDate() + 2);
  } else {
    // 월~금 → 현재 주 월요일
    monday.setDate(kstNow.getDate() - (dayOfWeek - 1));
  }

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  // date_range 형식: "1월 13일 ~ 1월 17일" (기존 DB 형식과 호환)
  const dateRange = `${monday.getMonth() + 1}월 ${monday.getDate()}일 ~ ${friday.getMonth() + 1}월 ${friday.getDate()}일`;

  // year와 week 계산
  const year = monday.getFullYear();
  const week = getISOWeek(monday);

  return { year, week, dateRange, monday, friday };
}

/**
 * date_range 문자열을 표시용 형식으로 변환
 * "1.13-1.17" → "1월 13일 ~ 1월 17일"
 * @param {string} dateRange - "1.13-1.17" 형식
 * @returns {string} "1월 13일 ~ 1월 17일" 형식
 */
export function formatDateRangeForDisplay(dateRange) {
  if (!dateRange) return '';

  const match = dateRange.match(/(\d+)\.(\d+)-(\d+)\.(\d+)/);
  if (!match) return dateRange;

  const [, startMonth, startDay, endMonth, endDay] = match;
  return `${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
}
