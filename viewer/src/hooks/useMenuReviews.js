import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllMenuReviews,
  createMenuReview,
  hasReviewedMenu,
  getAverageRating
} from '../utils/communityApi';
import { getAnonymousId } from '../utils/anonymousUser';
import { useAuth } from './useAuth';
import { getKoreanDateString } from '../utils/koreanDate';

export function useMenuReviews(restaurants = []) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [ratings, setRatings] = useState({}); // { "식당명_점심": { average: 4.5, count: 10 } }
  const [userReviews, setUserReviews] = useState({}); // { "식당명_점심": true }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.id || null;
  const anonymousId = !userId ? getAnonymousId() : null;
  const displayName = user?.user_metadata?.display_name || anonymousId;

  // Fetch all reviews and ratings
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch today's reviews
      const { data: reviewsData, error: reviewsError } = await fetchAllMenuReviews();

      if (reviewsError) throw reviewsError;

      setReviews(reviewsData || []);

      // Calculate ratings for each restaurant/meal type
      const ratingsMap = {};
      const userReviewsMap = {};

      for (const restaurant of restaurants) {
        for (const mealType of ['점심', '저녁']) {
          const key = `${restaurant}_${mealType}`;

          // Get average rating
          const { average, count } = await getAverageRating(restaurant, mealType);
          ratingsMap[key] = { average, count };

          // Check if user has reviewed
          const { hasReviewed } = await hasReviewedMenu(restaurant, mealType, userId, anonymousId);
          userReviewsMap[key] = hasReviewed;
        }
      }

      setRatings(ratingsMap);
      setUserReviews(userReviewsMap);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [restaurants, userId, anonymousId]);

  useEffect(() => {
    if (restaurants.length > 0) {
      fetchData();
    }
  }, [fetchData, restaurants.length]);

  // Submit a review
  const submitReview = useCallback(async ({ restaurantName, mealType, rating, comment }) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const { data, error: submitError } = await createMenuReview({
        restaurantName,
        mealType,
        rating,
        comment,
        displayName,
        isAnonymous: !userId,
        userId,
        anonymousId,
      });

      if (submitError) {
        // Check for duplicate error
        if (submitError.code === '23505') {
          throw new Error('이미 이 메뉴에 리뷰를 작성했습니다.');
        }
        throw submitError;
      }

      // Refetch data
      await fetchData();

      return { success: true, data };
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  }, [userId, anonymousId, displayName, submitting, fetchData]);

  // Get rating for a specific restaurant/meal
  const getRating = useCallback((restaurantName, mealType) => {
    const key = `${restaurantName}_${mealType}`;
    return ratings[key] || { average: 0, count: 0 };
  }, [ratings]);

  // Check if user has reviewed a specific restaurant/meal
  const hasReviewed = useCallback((restaurantName, mealType) => {
    const key = `${restaurantName}_${mealType}`;
    return userReviews[key] || false;
  }, [userReviews]);

  // Get reviews for a specific restaurant/meal
  const getReviewsFor = useCallback((restaurantName, mealType = null) => {
    return reviews.filter(r => {
      if (r.restaurant_name !== restaurantName) return false;
      if (mealType && r.meal_type !== mealType) return false;
      return true;
    });
  }, [reviews]);

  return {
    reviews,
    ratings,
    loading,
    submitting,
    error,
    submitReview,
    getRating,
    hasReviewed,
    getReviewsFor,
    refetch: fetchData,
  };
}
