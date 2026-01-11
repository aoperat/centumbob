/**
 * 주차 계산 및 날짜 범위 생성 유틸리티
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
  // 일요일(0)이면 +1, 월요일(1)이면 0, 화요일(2)이면 -1, ..., 토요일(6)이면 -5
  const daysToAdd = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 1 - dayOfWeek;
  const firstMonday = new Date(year, 0, 1);
  firstMonday.setDate(1 + daysToAdd);
  return firstMonday;
}

/**
 * 주차를 선택하여 해당 주의 월~금 날짜 범위 계산
 * @param {number} year - 년도 (예: 2025)
 * @param {number} week - 주차 (1부터 시작)
 * @returns {Object} { dateRange: "1월 5일 ~ 1월 9일", startDate: Date, endDate: Date, dates: Array }
 */
export function getWeekDateRange(year, week) {
  if (!year || !week || week < 1) {
    throw new Error('유효한 년도와 주차를 입력해주세요.');
  }

  const firstMonday = getFirstMondayOfYear(year);
  
  // 해당 주차의 월요일 계산
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  
  // 월~금 날짜 배열
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(targetMonday);
    date.setDate(targetMonday.getDate() + i);
    dates.push(date);
  }
  
  const startDate = dates[0];
  const endDate = dates[4];
  
  // 기존 형식으로 변환: "1월 5일 ~ 1월 9일"
  const formatDate = (date) => {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };
  
  const dateRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
  
  return {
    dateRange,
    startDate,
    endDate,
    dates, // [월, 화, 수, 목, 금] Date 배열
    year,
    week
  };
}

/**
 * 해당 년도의 총 주차 수 계산
 * @param {number} year - 년도
 * @returns {number} 총 주차 수
 */
export function getTotalWeeks(year) {
  if (!year) return 52;
  
  const firstMonday = getFirstMondayOfYear(year);
  const nextYear = year + 1;
  const nextYearFirstMonday = getFirstMondayOfYear(nextYear);
  
  // 두 첫 월요일 사이의 밀리초 차이
  const diffMs = nextYearFirstMonday - firstMonday;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(diffDays / 7);
  
  return totalWeeks;
}

/**
 * 날짜 범위 문자열에서 년도와 주차 추출 (기존 형식: "1월 5일 ~ 1월 9일")
 * @param {string} dateRange - "1월 5일 ~ 1월 9일" 형식
 * @param {number} year - 추정 년도 (기본값: 현재 년도)
 * @returns {Object|null} { year, week } 또는 null
 */
export function parseDateRangeToWeek(dateRange, year = new Date().getFullYear()) {
  if (!dateRange || typeof dateRange !== 'string') {
    return null;
  }

  // "1월 5일 ~ 1월 9일" 형식 파싱
  const match = dateRange.match(/(\d+)월\s*(\d+)일/);
  if (!match) {
    return null;
  }

  const startMonth = parseInt(match[1], 10);
  const startDay = parseInt(match[2], 10);

  try {
    const startDate = new Date(year, startMonth - 1, startDay);
    
    // 해당 날짜가 속한 주의 월요일 찾기
    const dayOfWeek = startDate.getDay(); // 0=일요일, 1=월요일, ...
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(startDate);
    monday.setDate(startDate.getDate() - daysToMonday);
    
    // 해당 년도의 첫 월요일 찾기
    const firstMonday = getFirstMondayOfYear(monday.getFullYear());
    
    // 주차 계산
    const diffMs = monday - firstMonday;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    
    return {
      year: monday.getFullYear(),
      week: week > 0 ? week : 1
    };
  } catch (error) {
    console.error('날짜 범위 파싱 오류:', error);
    return null;
  }
}
