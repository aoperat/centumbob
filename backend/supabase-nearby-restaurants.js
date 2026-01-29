/**
 * 주변 식당 추천 커뮤니티 - Supabase 데이터베이스 모듈
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================
// 식당 CRUD
// =====================

/**
 * 주변 식당 목록 조회
 */
export async function getNearbyRestaurants({
  lat,
  lng,
  radius = 2000, // 미터
  category,
  priceRange,
  tags,
  sort = 'distance', // 'distance', 'rating', 'review_count', 'newest'
  page = 1,
  limit = 20,
} = {}) {
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

  // 태그 필터 (배열에 포함된 태그)
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
      // distance 정렬은 클라이언트에서 처리
      query = query.order('created_at', { ascending: false });
  }

  // 페이징
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('식당 목록 조회 오류:', error);
    throw error;
  }

  // 거리 계산 (Haversine formula)
  let restaurants = data || [];
  if (lat && lng) {
    restaurants = restaurants.map((r) => ({
      ...r,
      distance: calculateDistance(lat, lng, r.latitude, r.longitude),
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
}

/**
 * 식당 상세 조회
 */
export async function getRestaurantById(id) {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('식당 상세 조회 오류:', error);
    throw error;
  }

  return data;
}

/**
 * 식당 등록
 */
export async function createRestaurant(restaurantData) {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .insert(restaurantData)
    .select()
    .single();

  if (error) {
    console.error('식당 등록 오류:', error);
    throw error;
  }

  return data;
}

/**
 * 식당 수정
 */
export async function updateRestaurant(id, restaurantData) {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .update({ ...restaurantData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('식당 수정 오류:', error);
    throw error;
  }

  return data;
}

/**
 * 식당 삭제 (soft delete)
 */
export async function deleteRestaurant(id) {
  const { data, error } = await supabase
    .from('centumbob_nearby_restaurants')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('식당 삭제 오류:', error);
    throw error;
  }

  return data;
}

// =====================
// 리뷰 CRUD
// =====================

/**
 * 식당 리뷰 목록 조회
 */
export async function getRestaurantReviews(restaurantId, { sort = 'newest', page = 1, limit = 10 } = {}) {
  let query = supabase
    .from('centumbob_restaurant_reviews')
    .select('*, user:auth.users(id, email, raw_user_meta_data)')
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
    throw error;
  }

  return { reviews: data || [], total: count };
}

/**
 * 리뷰 작성
 */
export async function createReview(reviewData) {
  const { data, error } = await supabase
    .from('centumbob_restaurant_reviews')
    .insert(reviewData)
    .select()
    .single();

  if (error) {
    console.error('리뷰 작성 오류:', error);
    throw error;
  }

  return data;
}

/**
 * 리뷰 수정
 */
export async function updateReview(id, reviewData) {
  const { data, error } = await supabase
    .from('centumbob_restaurant_reviews')
    .update({ ...reviewData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('리뷰 수정 오류:', error);
    throw error;
  }

  return data;
}

/**
 * 리뷰 삭제 (soft delete)
 */
export async function deleteReview(id) {
  const { data, error } = await supabase
    .from('centumbob_restaurant_reviews')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('리뷰 삭제 오류:', error);
    throw error;
  }

  return data;
}

/**
 * 리뷰 도움됨 토글
 */
export async function toggleReviewHelpful(reviewId, userId) {
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

    if (error) throw error;
    return { helpful: false };
  } else {
    // 없으면 추가
    const { error } = await supabase
      .from('centumbob_review_helpful')
      .insert({ review_id: reviewId, user_id: userId });

    if (error) throw error;
    return { helpful: true };
  }
}

// =====================
// 찜하기
// =====================

/**
 * 찜하기 토글
 */
export async function toggleBookmark(restaurantId, userId) {
  // 기존 찜하기 확인
  const { data: existing } = await supabase
    .from('centumbob_restaurant_bookmarks')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    // 이미 있으면 삭제
    const { error } = await supabase
      .from('centumbob_restaurant_bookmarks')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;
    return { bookmarked: false };
  } else {
    // 없으면 추가
    const { error } = await supabase
      .from('centumbob_restaurant_bookmarks')
      .insert({ restaurant_id: restaurantId, user_id: userId });

    if (error) throw error;
    return { bookmarked: true };
  }
}

/**
 * 사용자 찜 목록 조회
 */
export async function getUserBookmarks(userId) {
  const { data, error } = await supabase
    .from('centumbob_restaurant_bookmarks')
    .select('*, restaurant:centumbob_nearby_restaurants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('찜 목록 조회 오류:', error);
    throw error;
  }

  return data || [];
}

/**
 * 찜 여부 확인
 */
export async function checkBookmark(restaurantId, userId) {
  const { data } = await supabase
    .from('centumbob_restaurant_bookmarks')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

// =====================
// 오늘의 투표
// =====================

/**
 * 오늘의 투표 조회 (없으면 생성)
 */
export async function getTodayPoll() {
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

      if (error) throw error;
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
}

/**
 * 투표하기
 */
export async function vote(pollId, restaurantId, userId, anonymousId) {
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
      // unique constraint violation
      throw new Error('이미 투표하셨습니다.');
    }
    throw error;
  }

  return data;
}

// =====================
// 점심 모임
// =====================

/**
 * 오늘의 점심 모임 목록
 */
export async function getTodayGatherings() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('centumbob_lunch_gatherings')
    .select('*, restaurant:centumbob_nearby_restaurants(id, name, category), participants:centumbob_gathering_participants(user_id)')
    .eq('gathering_date', today)
    .in('status', ['open', 'full'])
    .order('gathering_time', { ascending: true });

  if (error) throw error;

  return (data || []).map((g) => ({
    ...g,
    current_participants: g.participants?.length || 0,
  }));
}

/**
 * 점심 모임 생성
 */
export async function createGathering(gatheringData) {
  const { data, error } = await supabase
    .from('centumbob_lunch_gatherings')
    .insert(gatheringData)
    .select()
    .single();

  if (error) throw error;

  // 호스트를 참여자로 자동 추가
  await supabase.from('centumbob_gathering_participants').insert({
    gathering_id: data.id,
    user_id: gatheringData.host_user_id,
  });

  return data;
}

/**
 * 점심 모임 참여
 */
export async function joinGathering(gatheringId, userId) {
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
    throw error;
  }

  // 가득 찼으면 상태 변경
  if (currentCount + 1 >= gathering.max_participants) {
    await supabase
      .from('centumbob_lunch_gatherings')
      .update({ status: 'full' })
      .eq('id', gatheringId);
  }

  return { joined: true };
}

/**
 * 점심 모임 나가기
 */
export async function leaveGathering(gatheringId, userId) {
  const { error } = await supabase
    .from('centumbob_gathering_participants')
    .delete()
    .eq('gathering_id', gatheringId)
    .eq('user_id', userId);

  if (error) throw error;

  // 상태를 open으로 변경
  await supabase
    .from('centumbob_lunch_gatherings')
    .update({ status: 'open' })
    .eq('id', gatheringId)
    .eq('status', 'full');

  return { left: true };
}

// =====================
// 꿀팁 게시판
// =====================

/**
 * 꿀팁 목록 조회
 */
export async function getTips({ restaurantId, sort = 'newest', page = 1, limit = 20 } = {}) {
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

  if (error) throw error;
  return data || [];
}

/**
 * 꿀팁 작성
 */
export async function createTip(tipData) {
  const { data, error } = await supabase
    .from('centumbob_restaurant_tips')
    .insert(tipData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 꿀팁 좋아요 토글
 */
export async function toggleTipLike(tipId, userId) {
  const { data: existing } = await supabase
    .from('centumbob_tip_likes')
    .select('id')
    .eq('tip_id', tipId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase.from('centumbob_tip_likes').delete().eq('id', existing.id);
    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await supabase.from('centumbob_tip_likes').insert({ tip_id: tipId, user_id: userId });
    if (error) throw error;
    return { liked: true };
  }
}

/**
 * 꿀팁 댓글 목록
 */
export async function getTipComments(tipId) {
  const { data, error } = await supabase
    .from('centumbob_tip_comments')
    .select('*')
    .eq('tip_id', tipId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * 꿀팁 댓글 작성
 */
export async function createTipComment(commentData) {
  const { data, error } = await supabase
    .from('centumbob_tip_comments')
    .insert(commentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================
// 유틸리티
// =====================

/**
 * Haversine 공식을 이용한 거리 계산 (미터)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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

/**
 * 카테고리 목록
 */
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

/**
 * 가격대 목록
 */
export const PRICE_RANGES = [
  { value: 'under_10k', label: '1만원 미만' },
  { value: '10k_15k', label: '1-1.5만원' },
  { value: '15k_20k', label: '1.5-2만원' },
  { value: 'over_20k', label: '2만원 이상' },
];

/**
 * 태그 목록
 */
export const TAGS = {
  atmosphere: ['조용해요', '활기차요', '분위기좋아요', '깔끔해요'],
  convenience: ['주차가능', '혼밥가능', '단체가능', '예약가능', '포장가능'],
  feature: ['가성비좋아요', '양많아요', '맛있어요', '친절해요'],
  notice: ['웨이팅있어요', '현금만', '브레이크타임있어요'],
};
