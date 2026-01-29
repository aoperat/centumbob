/**
 * 주변 식당 추천 커뮤니티 API 라우터
 */

import express from 'express';
import {
  getNearbyRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleReviewHelpful,
  toggleBookmark,
  getUserBookmarks,
  checkBookmark,
  getTodayPoll,
  vote,
  getTodayGatherings,
  createGathering,
  joinGathering,
  leaveGathering,
  getTips,
  createTip,
  toggleTipLike,
  getTipComments,
  createTipComment,
  CATEGORIES,
  PRICE_RANGES,
  TAGS,
} from '../supabase-nearby-restaurants.js';

const router = express.Router();

// =====================
// 상수 데이터
// =====================

/**
 * 카테고리, 가격대, 태그 목록 조회
 */
router.get('/constants', (req, res) => {
  res.json({
    categories: CATEGORIES,
    priceRanges: PRICE_RANGES,
    tags: TAGS,
  });
});

// =====================
// 식당 API
// =====================

/**
 * 식당 목록 조회
 * GET /api/nearby-restaurants?lat=35.1796&lng=129.0756&category=한식&sort=distance
 */
router.get('/', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius,
      category,
      price_range: priceRange,
      tags,
      sort,
      page,
      limit,
    } = req.query;

    const result = await getNearbyRestaurants({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseInt(radius) : undefined,
      category,
      priceRange,
      tags: tags ? tags.split(',') : undefined,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json(result);
  } catch (error) {
    console.error('식당 목록 조회 오류:', error);
    res.status(500).json({ error: '식당 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * 식당 상세 조회
 * GET /api/nearby-restaurants/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await getRestaurantById(id);

    if (!restaurant) {
      return res.status(404).json({ error: '식당을 찾을 수 없습니다.' });
    }

    res.json(restaurant);
  } catch (error) {
    console.error('식당 상세 조회 오류:', error);
    res.status(500).json({ error: '식당 정보를 불러오는데 실패했습니다.' });
  }
});

/**
 * 식당 등록
 * POST /api/nearby-restaurants
 */
router.post('/', async (req, res) => {
  try {
    const restaurantData = req.body;

    // 필수 필드 검증
    const required = ['name', 'address', 'latitude', 'longitude', 'category', 'price_range'];
    const missing = required.filter((f) => !restaurantData[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `필수 필드가 누락되었습니다: ${missing.join(', ')}` });
    }

    const restaurant = await createRestaurant(restaurantData);
    res.status(201).json(restaurant);
  } catch (error) {
    console.error('식당 등록 오류:', error);
    res.status(500).json({ error: '식당 등록에 실패했습니다.' });
  }
});

/**
 * 식당 수정
 * PUT /api/nearby-restaurants/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantData = req.body;

    const restaurant = await updateRestaurant(id, restaurantData);
    res.json(restaurant);
  } catch (error) {
    console.error('식당 수정 오류:', error);
    res.status(500).json({ error: '식당 수정에 실패했습니다.' });
  }
});

/**
 * 식당 삭제
 * DELETE /api/nearby-restaurants/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteRestaurant(id);
    res.json({ success: true });
  } catch (error) {
    console.error('식당 삭제 오류:', error);
    res.status(500).json({ error: '식당 삭제에 실패했습니다.' });
  }
});

// =====================
// 리뷰 API
// =====================

/**
 * 식당 리뷰 목록 조회
 * GET /api/nearby-restaurants/:id/reviews
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { sort, page, limit } = req.query;

    const result = await getRestaurantReviews(id, {
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });

    res.json(result);
  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '리뷰 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * 리뷰 작성
 * POST /api/nearby-restaurants/reviews
 */
router.post('/reviews', async (req, res) => {
  try {
    const reviewData = req.body;

    // 필수 필드 검증
    if (!reviewData.restaurant_id || !reviewData.rating) {
      return res.status(400).json({ error: '식당 ID와 별점은 필수입니다.' });
    }

    if (reviewData.rating < 1 || reviewData.rating > 5) {
      return res.status(400).json({ error: '별점은 1-5 사이여야 합니다.' });
    }

    const review = await createReview(reviewData);
    res.status(201).json(review);
  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '리뷰 작성에 실패했습니다.' });
  }
});

/**
 * 리뷰 수정
 * PUT /api/nearby-restaurants/reviews/:id
 */
router.put('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reviewData = req.body;

    const review = await updateReview(id, reviewData);
    res.json(review);
  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({ error: '리뷰 수정에 실패했습니다.' });
  }
});

/**
 * 리뷰 삭제
 * DELETE /api/nearby-restaurants/reviews/:id
 */
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteReview(id);
    res.json({ success: true });
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({ error: '리뷰 삭제에 실패했습니다.' });
  }
});

/**
 * 리뷰 도움됨 토글
 * POST /api/nearby-restaurants/reviews/:id/helpful
 */
router.post('/reviews/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const result = await toggleReviewHelpful(id, user_id);
    res.json(result);
  } catch (error) {
    console.error('리뷰 도움됨 토글 오류:', error);
    res.status(500).json({ error: '처리에 실패했습니다.' });
  }
});

// =====================
// 찜하기 API
// =====================

/**
 * 찜하기 토글
 * POST /api/nearby-restaurants/:id/bookmark
 */
router.post('/:id/bookmark', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const result = await toggleBookmark(id, user_id);
    res.json(result);
  } catch (error) {
    console.error('찜하기 토글 오류:', error);
    res.status(500).json({ error: '처리에 실패했습니다.' });
  }
});

/**
 * 찜 여부 확인
 * GET /api/nearby-restaurants/:id/bookmark?user_id=xxx
 */
router.get('/:id/bookmark', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const bookmarked = await checkBookmark(id, user_id);
    res.json({ bookmarked });
  } catch (error) {
    console.error('찜 여부 확인 오류:', error);
    res.status(500).json({ error: '처리에 실패했습니다.' });
  }
});

/**
 * 사용자 찜 목록 조회
 * GET /api/nearby-restaurants/bookmarks?user_id=xxx
 */
router.get('/user/bookmarks', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const bookmarks = await getUserBookmarks(user_id);
    res.json(bookmarks);
  } catch (error) {
    console.error('찜 목록 조회 오류:', error);
    res.status(500).json({ error: '찜 목록을 불러오는데 실패했습니다.' });
  }
});

// =====================
// 투표 API
// =====================

/**
 * 오늘의 투표 조회
 * GET /api/nearby-restaurants/poll/today
 */
router.get('/poll/today', async (req, res) => {
  try {
    const poll = await getTodayPoll();
    res.json(poll);
  } catch (error) {
    console.error('투표 조회 오류:', error);
    res.status(500).json({ error: '투표 정보를 불러오는데 실패했습니다.' });
  }
});

/**
 * 투표하기
 * POST /api/nearby-restaurants/poll/vote
 */
router.post('/poll/vote', async (req, res) => {
  try {
    const { poll_id, restaurant_id, user_id, anonymous_id } = req.body;

    if (!poll_id || !restaurant_id) {
      return res.status(400).json({ error: '투표 ID와 식당 ID가 필요합니다.' });
    }

    if (!user_id && !anonymous_id) {
      return res.status(400).json({ error: '사용자 ID 또는 익명 ID가 필요합니다.' });
    }

    const result = await vote(poll_id, restaurant_id, user_id, anonymous_id);
    res.json(result);
  } catch (error) {
    console.error('투표 오류:', error);
    if (error.message === '이미 투표하셨습니다.') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: '투표에 실패했습니다.' });
  }
});

// =====================
// 점심 모임 API
// =====================

/**
 * 오늘의 점심 모임 목록
 * GET /api/nearby-restaurants/gatherings/today
 */
router.get('/gatherings/today', async (req, res) => {
  try {
    const gatherings = await getTodayGatherings();
    res.json(gatherings);
  } catch (error) {
    console.error('점심 모임 목록 조회 오류:', error);
    res.status(500).json({ error: '점심 모임 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * 점심 모임 생성
 * POST /api/nearby-restaurants/gatherings
 */
router.post('/gatherings', async (req, res) => {
  try {
    const gatheringData = req.body;

    if (!gatheringData.restaurant_id || !gatheringData.host_user_id) {
      return res.status(400).json({ error: '식당 ID와 호스트 ID가 필요합니다.' });
    }

    if (!gatheringData.gathering_date || !gatheringData.gathering_time) {
      return res.status(400).json({ error: '모임 날짜와 시간이 필요합니다.' });
    }

    const gathering = await createGathering(gatheringData);
    res.status(201).json(gathering);
  } catch (error) {
    console.error('점심 모임 생성 오류:', error);
    res.status(500).json({ error: '점심 모임 생성에 실패했습니다.' });
  }
});

/**
 * 점심 모임 참여
 * POST /api/nearby-restaurants/gatherings/:id/join
 */
router.post('/gatherings/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const result = await joinGathering(id, user_id);
    res.json(result);
  } catch (error) {
    console.error('점심 모임 참여 오류:', error);
    res.status(400).json({ error: error.message || '참여에 실패했습니다.' });
  }
});

/**
 * 점심 모임 나가기
 * DELETE /api/nearby-restaurants/gatherings/:id/leave
 */
router.delete('/gatherings/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const result = await leaveGathering(id, user_id);
    res.json(result);
  } catch (error) {
    console.error('점심 모임 나가기 오류:', error);
    res.status(500).json({ error: '나가기에 실패했습니다.' });
  }
});

// =====================
// 꿀팁 API
// =====================

/**
 * 꿀팁 목록 조회
 * GET /api/nearby-restaurants/tips
 */
router.get('/tips', async (req, res) => {
  try {
    const { restaurant_id, sort, page, limit } = req.query;

    const tips = await getTips({
      restaurantId: restaurant_id,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.json(tips);
  } catch (error) {
    console.error('꿀팁 목록 조회 오류:', error);
    res.status(500).json({ error: '꿀팁 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * 꿀팁 작성
 * POST /api/nearby-restaurants/tips
 */
router.post('/tips', async (req, res) => {
  try {
    const tipData = req.body;

    if (!tipData.title || !tipData.content) {
      return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
    }

    const tip = await createTip(tipData);
    res.status(201).json(tip);
  } catch (error) {
    console.error('꿀팁 작성 오류:', error);
    res.status(500).json({ error: '꿀팁 작성에 실패했습니다.' });
  }
});

/**
 * 꿀팁 좋아요 토글
 * POST /api/nearby-restaurants/tips/:id/like
 */
router.post('/tips/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
    }

    const result = await toggleTipLike(id, user_id);
    res.json(result);
  } catch (error) {
    console.error('꿀팁 좋아요 토글 오류:', error);
    res.status(500).json({ error: '처리에 실패했습니다.' });
  }
});

/**
 * 꿀팁 댓글 목록
 * GET /api/nearby-restaurants/tips/:id/comments
 */
router.get('/tips/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await getTipComments(id);
    res.json(comments);
  } catch (error) {
    console.error('꿀팁 댓글 목록 조회 오류:', error);
    res.status(500).json({ error: '댓글 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * 꿀팁 댓글 작성
 * POST /api/nearby-restaurants/tips/:id/comments
 */
router.post('/tips/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '댓글 내용이 필요합니다.' });
    }

    const comment = await createTipComment({
      tip_id: id,
      user_id,
      content,
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error('꿀팁 댓글 작성 오류:', error);
    res.status(500).json({ error: '댓글 작성에 실패했습니다.' });
  }
});

export default router;
