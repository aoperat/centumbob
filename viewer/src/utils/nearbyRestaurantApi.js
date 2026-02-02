/**
 * 주변 식당 추천 커뮤니티 API 클라이언트
 * Supabase 직접 연결 방식 (프로덕션 지원)
 */

import { supabase } from './supabaseClient';

// =====================
// 상수 데이터
// =====================

export const CATEGORIES = [
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '패스트푸드',
  '카페',
  '베이커리',
  '아시안',
  '기타',
];

export const PRICE_RANGES = [
  { value: 'under_10k', label: '1만원 미만' },
  { value: '10k_15k', label: '1-1.5만원' },
  { value: '15k_20k', label: '1.5-2만원' },
  { value: 'over_20k', label: '2만원 이상' },
];

export const TAGS = {
  atmosphere: ['조용해요', '활기차요', '분위기좋아요', '깔끔해요'],
  convenience: ['주차가능', '혼밥가능', '단체가능', '예약가능', '포장가능'],
  feature: ['가성비좋아요', '양많아요', '맛있어요', '친절해요'],
  notice: ['웨이팅있어요', '현금만', '브레이크타임있어요'],
};

/**
 * 카테고리, 가격대, 태그 목록 조회
 */
export const getConstants = async () => {
  return {
    categories: CATEGORIES,
    priceRanges: PRICE_RANGES,
    tags: TAGS,
  };
};

// =====================
// 유틸리티 함수
// =====================

/**
 * Haversine 공식을 이용한 거리 계산 (미터)
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// =====================
// 식당 API
// =====================

/**
 * 식당 목록 조회
 */
export const getNearbyRestaurants = async ({
  lat,
  lng,
  radius = 2000,
  category,
  priceRange,
  tags,
  sort = 'distance',
  page = 1,
  limit = 20,
} = {}) => {
  try {
    let query = supabase
      .from('centumbob_nearby_restaurants')
      .select('*')
      .eq('is_active', true);

    // 카테고리 필터
    if (category) {
      query = query.eq('category', category);
    }

    // 가격대 필터
    if (priceRange) {
      query = query.eq('price_range', priceRange);
    }

    // 태그 필터
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    // 정렬
    switch (sort) {
      case 'rating':
        query = query.order('avg_rating', { ascending: false });
        break;
      case 'review_count':
        query = query.order('review_count', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 페이징
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('식당 목록 조회 오류:', error);
      throw new Error('식당 목록을 불러오는데 실패했습니다.');
    }

    // 거리 계산
    let restaurants = data || [];
    if (lat && lng) {
      restaurants = restaurants.map((r) => ({
        ...r,
        distance: calculateDistanceMeters(lat, lng, r.latitude, r.longitude),
      }));

      // 반경 필터
      if (radius) {
        restaurants = restaurants.filter((r) => r.distance <= radius);
      }

      // 거리순 정렬
      if (sort === 'distance') {
        restaurants.sort((a, b) => a.distance - b.distance);
      }
    }

    return { restaurants, total: count };
  } catch (error) {
    console.error('식당 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 식당 상세 조회
 */
export const getRestaurantById = async (id) => {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('식당 상세 조회 오류:', error);
    throw new Error('식당 정보를 불러오는데 실패했습니다.');
  }

  return data;
};

/**
 * 식당 등록
 */
export const createRestaurant = async (restaurantData) => {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .insert(restaurantData)
    .select()
    .single();

  if (error) {
    console.error('식당 등록 오류:', error);
    throw new Error('식당 등록에 실패했습니다.');
  }

  return data;
};

/**
 * 식당 수정
 */
export const updateRestaurant = async (id, restaurantData) => {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .update({ ...restaurantData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('식당 수정 오류:', error);
    throw new Error('식당 수정에 실패했습니다.');
  }

  return data;
};

/**
 * 식당 삭제
 */
export const deleteRestaurant = async (id) => {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('식당 삭제 오류:', error);
    throw new Error('식당 삭제에 실패했습니다.');
  }

  return data;
};

// =====================
// 리뷰 API
// =====================

/**
 * 식당 리뷰 목록 조회
 */
export const getRestaurantReviews = async (restaurantId, { sort = 'newest', page = 1, limit = 10 } = {}) => {
  let query = supabase
    .from('centumbob_restaurant_reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_deleted', false);

  // 정렬
  switch (sort) {
    case 'rating_high':
      query = query.order('rating', { ascending: false });
      break;
    case 'rating_low':
      query = query.order('rating', { ascending: true });
      break;
    case 'helpful':
      query = query.order('helpful_count', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  // 페이징
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('리뷰 목록 조회 오류:', error);
    throw new Error('리뷰 목록을 불러오는데 실패했습니다.');
  }

  return { reviews: data || [], total: count };
};

/**
 * 리뷰 작성
 */
export const createReview = async (reviewData) => {
  const { data, error } = await supabase
    .from('centumbob_restaurant_reviews')
    .insert(reviewData)
    .select()
    .single();

  if (error) {
    console.error('리뷰 작성 오류:', error);
    throw new Error('리뷰 작성에 실패했습니다.');
  }

  return data;
};

/**
 * 리뷰 수정
 */
export const updateReview = async (id, reviewData) => {
  const { data, error } = await supabase
    .from('centumbob_restaurant_reviews')
    .update({ ...reviewData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('리뷰 수정 오류:', error);
    throw new Error('리뷰 수정에 실패했습니다.');
  }

  return data;
};

/**
 * 리뷰 삭제
 */
export const deleteReview = async (id) => {
  const { data, error } = await supabase
    .from('centumbob_restaurant_reviews')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('리뷰 삭제 오류:', error);
    throw new Error('리뷰 삭제에 실패했습니다.');
  }

  return data;
};

/**
 * 리뷰 도움됨 토글
 */
export const toggleReviewHelpful = async (reviewId, userId) => {
  // 기존 도움됨 확인
  const { data: existing } = await supabase
    .from('centumbob_review_helpful')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // 이미 있으면 삭제
    const { error } = await supabase
      .from('centumbob_review_helpful')
      .delete()
      .eq('id', existing.id);

    if (error) throw new Error('처리에 실패했습니다.');
    return { helpful: false };
  } else {
    // 없으면 추가
    const { error } = await supabase
      .from('centumbob_review_helpful')
      .insert({ review_id: reviewId, user_id: userId });

    if (error) throw new Error('처리에 실패했습니다.');
    return { helpful: true };
  }
};

// =====================
// 찜하기 API
// =====================

/**
 * 찜하기 토글
 */
export const toggleBookmark = async (restaurantId, userId) => {
  // 기존 찜하기 확인
  const { data: existing } = await supabase
    .from('centumbob_restaurant_bookmarks')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('centumbob_restaurant_bookmarks')
      .delete()
      .eq('id', existing.id);

    if (error) throw new Error('처리에 실패했습니다.');
    return { bookmarked: false };
  } else {
    const { error } = await supabase
      .from('centumbob_restaurant_bookmarks')
      .insert({ restaurant_id: restaurantId, user_id: userId });

    if (error) throw new Error('처리에 실패했습니다.');
    return { bookmarked: true };
  }
};

/**
 * 찜 여부 확인
 */
export const checkBookmark = async (restaurantId, userId) => {
  const { data } = await supabase
    .from('centumbob_restaurant_bookmarks')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .single();

  return { bookmarked: !!data };
};

/**
 * 사용자 찜 목록 조회
 */
export const getUserBookmarks = async (userId) => {
  const { data, error } = await supabase
    .from('centumbob_restaurant_bookmarks')
    .select('*, restaurant:centumbob_nearby_restaurants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('찜 목록 조회 오류:', error);
    throw new Error('찜 목록을 불러오는데 실패했습니다.');
  }

  return data || [];
};

// =====================
// 투표 API
// =====================

/**
 * 오늘의 투표 조회 (없으면 생성)
 */
export const getTodayPoll = async () => {
  const today = new Date().toISOString().split('T')[0];

  // 기존 투표 조회
  let { data: poll } = await supabase
    .from('centumbob_daily_restaurant_polls')
    .select('*')
    .eq('poll_date', today)
    .single();

  if (!poll) {
    // 인기 식당 5개로 투표 생성
    const { data: topRestaurants } = await supabase
      .from('centumbob_nearby_restaurants')
      .select('id')
      .eq('is_active', true)
      .order('review_count', { ascending: false })
      .limit(5);

    if (topRestaurants && topRestaurants.length > 0) {
      const { data: newPoll, error } = await supabase
        .from('centumbob_daily_restaurant_polls')
        .insert({
          poll_date: today,
          restaurant_ids: topRestaurants.map((r) => r.id),
        })
        .select()
        .single();

      if (error) throw new Error('투표 생성에 실패했습니다.');
      poll = newPoll;
    }
  }

  if (!poll) return null;

  // 후보 식당 정보 조회
  const { data: restaurants } = await supabase
    .from('centumbob_nearby_restaurants')
    .select('id, name, category, avg_rating')
    .in('id', poll.restaurant_ids);

  // 투표 집계
  const { data: votes } = await supabase
    .from('centumbob_daily_poll_votes')
    .select('restaurant_id')
    .eq('poll_id', poll.id);

  const voteCounts = {};
  (votes || []).forEach((v) => {
    voteCounts[v.restaurant_id] = (voteCounts[v.restaurant_id] || 0) + 1;
  });

  return {
    ...poll,
    restaurants: (restaurants || []).map((r) => ({
      ...r,
      vote_count: voteCounts[r.id] || 0,
    })),
    total_votes: votes?.length || 0,
  };
};

/**
 * 투표하기
 */
export const vote = async ({ pollId, restaurantId, userId, anonymousId }) => {
  const voteData = {
    poll_id: pollId,
    restaurant_id: restaurantId,
  };

  if (userId) {
    voteData.user_id = userId;
  } else if (anonymousId) {
    voteData.anonymous_id = anonymousId;
  } else {
    throw new Error('userId 또는 anonymousId가 필요합니다.');
  }

  const { data, error } = await supabase
    .from('centumbob_daily_poll_votes')
    .insert(voteData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 투표하셨습니다.');
    }
    throw new Error('투표에 실패했습니다.');
  }

  return data;
};

// =====================
// 점심 모임 API
// =====================

/**
 * 오늘의 점심 모임 목록
 */
export const getTodayGatherings = async () => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('centumbob_lunch_gatherings')
    .select('*, restaurant:centumbob_nearby_restaurants(id, name, category), participants:centumbob_gathering_participants(user_id)')
    .eq('gathering_date', today)
    .in('status', ['open', 'full'])
    .order('gathering_time', { ascending: true });

  if (error) throw new Error('점심 모임 목록을 불러오는데 실패했습니다.');

  return (data || []).map((g) => ({
    ...g,
    current_participants: g.participants?.length || 0,
  }));
};

/**
 * 점심 모임 생성
 */
export const createGathering = async (gatheringData) => {
  const { data, error } = await supabase
    .from('centumbob_lunch_gatherings')
    .insert(gatheringData)
    .select()
    .single();

  if (error) throw new Error('점심 모임 생성에 실패했습니다.');

  // 호스트를 참여자로 자동 추가
  await supabase.from('centumbob_gathering_participants').insert({
    gathering_id: data.id,
    user_id: gatheringData.host_user_id,
  });

  return data;
};

/**
 * 점심 모임 참여
 */
export const joinGathering = async (gatheringId, userId) => {
  // 모임 정보 조회
  const { data: gathering } = await supabase
    .from('centumbob_lunch_gatherings')
    .select('*, participants:centumbob_gathering_participants(user_id)')
    .eq('id', gatheringId)
    .single();

  if (!gathering) throw new Error('모임을 찾을 수 없습니다.');
  if (gathering.status !== 'open') throw new Error('참여할 수 없는 모임입니다.');

  const currentCount = gathering.participants?.length || 0;
  if (currentCount >= gathering.max_participants) {
    throw new Error('모임이 가득 찼습니다.');
  }

  // 참여자 추가
  const { error } = await supabase.from('centumbob_gathering_participants').insert({
    gathering_id: gatheringId,
    user_id: userId,
  });

  if (error) {
    if (error.code === '23505') throw new Error('이미 참여 중입니다.');
    throw new Error('참여에 실패했습니다.');
  }

  // 가득 찼으면 상태 변경
  if (currentCount + 1 >= gathering.max_participants) {
    await supabase
      .from('centumbob_lunch_gatherings')
      .update({ status: 'full' })
      .eq('id', gatheringId);
  }

  return { joined: true };
};

/**
 * 점심 모임 나가기
 */
export const leaveGathering = async (gatheringId, userId) => {
  const { error } = await supabase
    .from('centumbob_gathering_participants')
    .delete()
    .eq('gathering_id', gatheringId)
    .eq('user_id', userId);

  if (error) throw new Error('나가기에 실패했습니다.');

  // 상태를 open으로 변경
  await supabase
    .from('centumbob_lunch_gatherings')
    .update({ status: 'open' })
    .eq('id', gatheringId)
    .eq('status', 'full');

  return { left: true };
};

// =====================
// 꿀팁 API
// =====================

/**
 * 꿀팁 목록 조회
 */
export const getTips = async ({ restaurantId, sort = 'newest', page = 1, limit = 20 } = {}) => {
  let query = supabase
    .from('centumbob_restaurant_tips')
    .select('*, restaurant:centumbob_nearby_restaurants(id, name)')
    .eq('is_deleted', false);

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  switch (sort) {
    case 'popular':
      query = query.order('like_count', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    console.error('꿀팁 목록 조회 오류:', error);
    throw new Error('꿀팁 목록을 불러오는데 실패했습니다.');
  }

  return data || [];
};

/**
 * 꿀팁 작성
 */
export const createTip = async (tipData) => {
  const { data, error } = await supabase
    .from('centumbob_restaurant_tips')
    .insert(tipData)
    .select()
    .single();

  if (error) throw new Error('꿀팁 작성에 실패했습니다.');
  return data;
};

/**
 * 꿀팁 좋아요 토글
 */
export const toggleTipLike = async (tipId, userId) => {
  const { data: existing } = await supabase
    .from('centumbob_tip_likes')
    .select('id')
    .eq('tip_id', tipId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase.from('centumbob_tip_likes').delete().eq('id', existing.id);
    if (error) throw new Error('처리에 실패했습니다.');
    return { liked: false };
  } else {
    const { error } = await supabase.from('centumbob_tip_likes').insert({ tip_id: tipId, user_id: userId });
    if (error) throw new Error('처리에 실패했습니다.');
    return { liked: true };
  }
};

/**
 * 꿀팁 댓글 목록
 */
export const getTipComments = async (tipId) => {
  const { data, error } = await supabase
    .from('centumbob_tip_comments')
    .select('*')
    .eq('tip_id', tipId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw new Error('댓글 목록을 불러오는데 실패했습니다.');
  return data || [];
};

/**
 * 꿀팁 댓글 작성
 */
export const createTipComment = async (tipId, userId, content) => {
  const { data, error } = await supabase
    .from('centumbob_tip_comments')
    .insert({ tip_id: tipId, user_id: userId, content })
    .select()
    .single();

  if (error) throw new Error('댓글 작성에 실패했습니다.');
  return data;
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
