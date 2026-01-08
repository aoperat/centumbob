import { fetchBlogNewsData } from './newsSearch.js';

// 캐시: 같은 날짜에 대해 여러 번 뉴스를 가져오는 것을 방지
let cachedNews = null;
let cachedDate = null;

/**
 * 오늘의 뉴스 데이터 가져오기 (실제 뉴스 크롤링 + GPT 정리)
 * @param {string} dateString - YYYY-MM-DD 형식
 * @returns {Promise<Object>} 뉴스 데이터
 */
export async function getDailyNews(dateString) {
  try {
    // 오늘 날짜인지 확인 (오늘 날짜만 실시간 크롤링)
    const today = new Date().toISOString().split('T')[0];

    // 캐시가 있고 같은 날짜라면 캐시 반환 (5분 유효)
    if (cachedNews && cachedDate === today && dateString === today) {
      console.log('[뉴스 제공] 캐시된 뉴스 데이터 반환');
      return cachedNews;
    }

    console.log('[뉴스 제공] 실제 뉴스 데이터 수집 시작...');

    // 실제 뉴스 가져오기
    const newsData = await fetchBlogNewsData();

    // 캐시 저장
    if (dateString === today) {
      cachedNews = newsData;
      cachedDate = today;

      // 5분 후 캐시 만료
      setTimeout(() => {
        cachedNews = null;
        cachedDate = null;
      }, 5 * 60 * 1000);
    }

    console.log('[뉴스 제공] 뉴스 데이터 수집 완료');
    return newsData;

  } catch (error) {
    console.error('[뉴스 제공] 뉴스 가져오기 실패:', error);

    // 실패 시 기본값 반환
    return {
      weather: "날씨 정보를 가져올 수 없습니다.",
      busanNews: [],
      nationalNews: [],
      lightNews: [],
      smallTalk: []
    };
  }
}

// 동기 버전 (기존 호환성 유지용 - 기본값만 반환)
export function getDailyNewsSync(dateString) {
  console.warn('[뉴스 제공] 동기 함수 호출됨 - 기본값 반환. 비동기 getDailyNews() 사용 권장');
  return {
    weather: "대체로 맑음",
    busanNews: "부산 지역 주요 소식",
    nationalNews: "오늘의 주요 뉴스",
    lightNews: "활기찬 하루를 위한 가벼운 소식",
    smallTalk: "오늘 점심 메뉴 고민"
  };
}
