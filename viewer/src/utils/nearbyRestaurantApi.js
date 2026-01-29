/**
 * 주변 식당 추천 커뮤니티 API 클라이언트
 */

// 개발 환경에서는 localhost, 프로덕션에서는 환경 변수 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9101';

/**
 * API 요청 헬퍼 함수
 */
const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}/api/nearby-restaurants${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('ERR_CONNECTION_REFUSED')
    ) {
      throw new Error('서버에 연결할 수 없습니다.');
    }
    throw error;
  }
};

// =====================
// 상수 데이터
// =====================

/**
 * 카테고리, 가격대, 태그 목록 조회
 */
export const getConstants = async () => {
  return fetchApi('/constants');
};

// =====================
// 식당 API
// =====================

/**
 * 식당 목록 조회
 */
export const getNearbyRestaurants = async ({
  lat,
  lng,
  radius,
  category,
  priceRange,
  tags,
  sort = 'distance',
  page = 1,
  limit = 20,
} = {}) => {
  const params = new URLSearchParams();

  if (lat) params.append('lat', lat);
  if (lng) params.append('lng', lng);
  if (radius) params.append('radius', radius);
  if (category) params.append('category', category);
  if (priceRange) params.append('price_range', priceRange);
  if (tags && tags.length > 0) params.append('tags', tags.join(','));
  if (sort) params.append('sort', sort);
  params.append('page', page);
  params.append('limit', limit);

  const queryString = params.toString();
  return fetchApi(`?${queryString}`);
};

/**
 * 식당 상세 조회
 */
export const getRestaurantById = async (id) => {
  return fetchApi(`/${id}`);
};

/**
 * 식당 등록
 */
export const createRestaurant = async (restaurantData) => {
  return fetchApi('', {
    method: 'POST',
    body: JSON.stringify(restaurantData),
  });
};

/**
 * 식당 수정
 */
export const updateRestaurant = async (id, restaurantData) => {
  return fetchApi(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify(restaurantData),
  });
};

/**
 * 식당 삭제
 */
export const deleteRestaurant = async (id) => {
  return fetchApi(`/${id}`, {
    method: 'DELETE',
  });
};

// =====================
// 리뷰 API
// =====================

/**
 * 식당 리뷰 목록 조회
 */
export const getRestaurantReviews = async (restaurantId, { sort = 'newest', page = 1, limit = 10 } = {}) => {
  const params = new URLSearchParams({ sort, page, limit });
  return fetchApi(`/${restaurantId}/reviews?${params.toString()}`);
};

/**
 * 리뷰 작성
 */
export const createReview = async (reviewData) => {
  return fetchApi('/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
};

/**
 * 리뷰 수정
 */
export const updateReview = async (id, reviewData) => {
  return fetchApi(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(reviewData),
  });
};

/**
 * 리뷰 삭제
 */
export const deleteReview = async (id) => {
  return fetchApi(`/reviews/${id}`, {
    method: 'DELETE',
  });
};

/**
 * 리뷰 도움됨 토글
 */
export const toggleReviewHelpful = async (reviewId, userId) => {
  return fetchApi(`/reviews/${reviewId}/helpful`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
};

// =====================
// 찜하기 API
// =====================

/**
 * 찜하기 토글
 */
export const toggleBookmark = async (restaurantId, userId) => {
  return fetchApi(`/${restaurantId}/bookmark`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
};

/**
 * 찜 여부 확인
 */
export const checkBookmark = async (restaurantId, userId) => {
  return fetchApi(`/${restaurantId}/bookmark?user_id=${userId}`);
};

/**
 * 사용자 찜 목록 조회
 */
export const getUserBookmarks = async (userId) => {
  return fetchApi(`/user/bookmarks?user_id=${userId}`);
};

// =====================
// 투표 API
// =====================

/**
 * 오늘의 투표 조회
 */
export const getTodayPoll = async () => {
  return fetchApi('/poll/today');
};

/**
 * 투표하기
 */
export const vote = async ({ pollId, restaurantId, userId, anonymousId }) => {
  return fetchApi('/poll/vote', {
    method: 'POST',
    body: JSON.stringify({
      poll_id: pollId,
      restaurant_id: restaurantId,
      user_id: userId,
      anonymous_id: anonymousId,
    }),
  });
};

// =====================
// 점심 모임 API
// =====================

/**
 * 오늘의 점심 모임 목록
 */
export const getTodayGatherings = async () => {
  return fetchApi('/gatherings/today');
};

/**
 * 점심 모임 생성
 */
export const createGathering = async (gatheringData) => {
  return fetchApi('/gatherings', {
    method: 'POST',
    body: JSON.stringify(gatheringData),
  });
};

/**
 * 점심 모임 참여
 */
export const joinGathering = async (gatheringId, userId) => {
  return fetchApi(`/gatherings/${gatheringId}/join`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
};

/**
 * 점심 모임 나가기
 */
export const leaveGathering = async (gatheringId, userId) => {
  return fetchApi(`/gatherings/${gatheringId}/leave`, {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId }),
  });
};

// =====================
// 꿀팁 API
// =====================

/**
 * 꿀팁 목록 조회
 */
export const getTips = async ({ restaurantId, sort = 'newest', page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ sort, page, limit });
  if (restaurantId) params.append('restaurant_id', restaurantId);
  return fetchApi(`/tips?${params.toString()}`);
};

/**
 * 꿀팁 작성
 */
export const createTip = async (tipData) => {
  return fetchApi('/tips', {
    method: 'POST',
    body: JSON.stringify(tipData),
  });
};

/**
 * 꿀팁 좋아요 토글
 */
export const toggleTipLike = async (tipId, userId) => {
  return fetchApi(`/tips/${tipId}/like`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
};

/**
 * 꿀팁 댓글 목록
 */
export const getTipComments = async (tipId) => {
  return fetchApi(`/tips/${tipId}/comments`);
};

/**
 * 꿀팁 댓글 작성
 */
export const createTipComment = async (tipId, userId, content) => {
  return fetchApi(`/tips/${tipId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, content }),
  });
};

// =====================
// 유틸리티
// =====================

/**
 * 거리 포맷팅 (미터 -> 표시 문자열)
 */
export const formatDistance = (meters) => {
  if (!meters) return '';
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * 도보 시간 계산 (평균 보행 속도: 분당 80m)
 */
export const calculateWalkTime = (meters) => {
  if (!meters) return '';
  const minutes = Math.ceil(meters / 80);
  return `도보 ${minutes}분`;
};

/**
 * 가격대 라벨 변환
 */
export const getPriceRangeLabel = (value) => {
  const labels = {
    under_10k: '1만원 미만',
    '10k_15k': '1-1.5만원',
    '15k_20k': '1.5-2만원',
    over_20k: '2만원 이상',
  };
  return labels[value] || value;
};

/**
 * 별점 표시 (이모지)
 */
export const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
};
