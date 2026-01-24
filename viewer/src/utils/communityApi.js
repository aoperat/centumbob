// Community feature API functions using Supabase
import { supabase } from './supabaseClient';
import { getKoreanDateString } from './koreanDate';

// ============================================
// 게시판 (Bulletin Board) API
// ============================================

/**
 * Fetch posts with optional category filter
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category ('자유', '메뉴후기', '맛집추천', '정보')
 * @param {number} options.limit - Number of posts to fetch
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function fetchPosts({ category = null, limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from('centumbob_community_posts')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single post by ID
 * @param {string} postId - Post UUID
 * @returns {Promise<{data: Object, error: Error}>}
 */
export async function fetchPost(postId) {
  const { data, error } = await supabase
    .from('centumbob_community_posts')
    .select('*')
    .eq('id', postId)
    .eq('is_deleted', false)
    .single();

  return { data, error };
}

/**
 * Create a new post
 * @param {Object} post - Post data
 * @returns {Promise<{data: Object, error: Error}>}
 */
export async function createPost({ category, title, content, displayName, isAnonymous, userId, anonymousId }) {
  const { data, error } = await supabase
    .from('centumbob_community_posts')
    .insert({
      category,
      title,
      content,
      display_name: displayName,
      is_anonymous: isAnonymous,
      user_id: userId || null,
      anonymous_id: !userId ? anonymousId : null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Increment view count for a post
 * @param {string} postId - Post UUID
 */
export async function incrementViewCount(postId) {
  await supabase.rpc('increment_view_count', { post_id: postId });
}

// ============================================
// 좋아요 (Likes) API
// ============================================

/**
 * Toggle like on a post
 * @param {string} postId - Post UUID
 * @param {string} userId - User UUID (nullable)
 * @param {string} anonymousId - Anonymous ID (for non-logged-in users)
 * @returns {Promise<{liked: boolean, error: Error}>}
 */
export async function toggleLike(postId, userId, anonymousId) {
  // Check if already liked
  let query = supabase
    .from('centumbob_post_likes')
    .select('id')
    .eq('post_id', postId);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('anonymous_id', anonymousId);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('centumbob_post_likes')
      .delete()
      .eq('id', existing.id);

    if (!error) {
      // Decrement like count
      await supabase.rpc('update_post_like_count', { post_id: postId, delta: -1 });
    }

    return { liked: false, error };
  } else {
    // Like
    const { error } = await supabase
      .from('centumbob_post_likes')
      .insert({
        post_id: postId,
        user_id: userId || null,
        anonymous_id: !userId ? anonymousId : null,
      });

    if (!error) {
      // Increment like count
      await supabase.rpc('update_post_like_count', { post_id: postId, delta: 1 });
    }

    return { liked: true, error };
  }
}

/**
 * Check if user has liked a post
 * @param {string} postId - Post UUID
 * @param {string} userId - User UUID (nullable)
 * @param {string} anonymousId - Anonymous ID
 * @returns {Promise<boolean>}
 */
export async function hasLikedPost(postId, userId, anonymousId) {
  let query = supabase
    .from('centumbob_post_likes')
    .select('id')
    .eq('post_id', postId);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('anonymous_id', anonymousId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

// ============================================
// 댓글 (Comments) API
// ============================================

/**
 * Fetch comments for a post
 * @param {string} postId - Post UUID
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from('centumbob_post_comments')
    .select('*')
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Create a comment
 * @param {Object} comment - Comment data
 * @returns {Promise<{data: Object, error: Error}>}
 */
export async function createComment({ postId, content, displayName, isAnonymous, userId, anonymousId, parentId }) {
  const { data, error } = await supabase
    .from('centumbob_post_comments')
    .insert({
      post_id: postId,
      parent_id: parentId || null,
      content,
      display_name: displayName,
      is_anonymous: isAnonymous,
      user_id: userId || null,
      anonymous_id: !userId ? anonymousId : null,
    })
    .select()
    .single();

  if (!error) {
    // Increment comment count
    await supabase.rpc('update_post_comment_count', { post_id: postId, delta: 1 });
  }

  return { data, error };
}

// ============================================
// 메뉴 리뷰 (Menu Reviews) API
// ============================================

/**
 * Fetch reviews for a restaurant on a specific date
 * @param {string} restaurantName - Restaurant name
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function fetchMenuReviews(restaurantName, date = null) {
  const reviewDate = date || getKoreanDateString();

  const { data, error } = await supabase
    .from('centumbob_menu_reviews')
    .select('*')
    .eq('restaurant_name', restaurantName)
    .eq('review_date', reviewDate)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Fetch all reviews for today (all restaurants)
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function fetchAllMenuReviews(date = null) {
  const reviewDate = date || getKoreanDateString();

  const { data, error } = await supabase
    .from('centumbob_menu_reviews')
    .select('*')
    .eq('review_date', reviewDate)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Create a menu review
 * @param {Object} review - Review data
 * @returns {Promise<{data: Object, error: Error}>}
 */
export async function createMenuReview({ restaurantName, mealType, rating, comment, displayName, isAnonymous, userId, anonymousId }) {
  const { data, error } = await supabase
    .from('centumbob_menu_reviews')
    .insert({
      restaurant_name: restaurantName,
      meal_type: mealType,
      rating,
      comment: comment || null,
      display_name: displayName,
      is_anonymous: isAnonymous,
      user_id: userId || null,
      anonymous_id: !userId ? anonymousId : null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Check if user has already reviewed
 * @param {string} restaurantName - Restaurant name
 * @param {string} mealType - '점심' or '저녁'
 * @param {string} userId - User UUID (nullable)
 * @param {string} anonymousId - Anonymous ID
 * @returns {Promise<{hasReviewed: boolean, review: Object}>}
 */
export async function hasReviewedMenu(restaurantName, mealType, userId, anonymousId) {
  const reviewDate = getKoreanDateString();

  let query = supabase
    .from('centumbob_menu_reviews')
    .select('*')
    .eq('restaurant_name', restaurantName)
    .eq('review_date', reviewDate)
    .eq('meal_type', mealType);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('anonymous_id', anonymousId);
  }

  const { data } = await query.maybeSingle();
  return { hasReviewed: !!data, review: data };
}

/**
 * Get average rating for a restaurant/meal
 * @param {string} restaurantName - Restaurant name
 * @param {string} mealType - '점심' or '저녁'
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<{average: number, count: number}>}
 */
export async function getAverageRating(restaurantName, mealType, date = null) {
  const reviewDate = date || getKoreanDateString();

  const { data, error } = await supabase
    .from('centumbob_menu_reviews')
    .select('rating')
    .eq('restaurant_name', restaurantName)
    .eq('review_date', reviewDate)
    .eq('meal_type', mealType);

  if (error || !data || data.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / data.length, count: data.length };
}

// ============================================
// 투표 (Voting) API
// ============================================

/**
 * Fetch today's votes
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function fetchVotes(date = null) {
  const voteDate = date || getKoreanDateString();

  const { data, error } = await supabase
    .from('centumbob_daily_votes')
    .select('*')
    .eq('vote_date', voteDate);

  return { data, error };
}

/**
 * Get vote counts by restaurant
 * @param {string} date - Date in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<{counts: Object, total: number}>}
 */
export async function getVoteCounts(date = null) {
  const { data, error } = await fetchVotes(date);

  if (error || !data) {
    return { counts: {}, total: 0 };
  }

  const counts = {};
  data.forEach(vote => {
    counts[vote.restaurant_name] = (counts[vote.restaurant_name] || 0) + 1;
  });

  return { counts, total: data.length };
}

/**
 * Cast a vote
 * @param {string} restaurantName - Restaurant to vote for
 * @param {string} userId - User UUID (nullable)
 * @param {string} anonymousId - Anonymous ID
 * @returns {Promise<{data: Object, error: Error}>}
 */
export async function castVote(restaurantName, userId, anonymousId) {
  // First, delete any existing vote for today
  const voteDate = getKoreanDateString();

  let deleteQuery = supabase
    .from('centumbob_daily_votes')
    .delete()
    .eq('vote_date', voteDate);

  if (userId) {
    deleteQuery = deleteQuery.eq('user_id', userId);
  } else {
    deleteQuery = deleteQuery.eq('anonymous_id', anonymousId);
  }

  await deleteQuery;

  // Then, insert new vote
  const { data, error } = await supabase
    .from('centumbob_daily_votes')
    .insert({
      restaurant_name: restaurantName,
      user_id: userId || null,
      anonymous_id: !userId ? anonymousId : null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get user's current vote
 * @param {string} userId - User UUID (nullable)
 * @param {string} anonymousId - Anonymous ID
 * @returns {Promise<{vote: Object}>}
 */
export async function getUserVote(userId, anonymousId) {
  const voteDate = getKoreanDateString();

  let query = supabase
    .from('centumbob_daily_votes')
    .select('*')
    .eq('vote_date', voteDate);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('anonymous_id', anonymousId);
  }

  const { data } = await query.maybeSingle();
  return { vote: data };
}

/**
 * Subscribe to realtime vote updates
 * @param {Function} callback - Callback function for updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToVotes(callback) {
  const voteDate = getKoreanDateString();

  const subscription = supabase
    .channel('votes-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'centumbob_daily_votes',
        filter: `vote_date=eq.${voteDate}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
