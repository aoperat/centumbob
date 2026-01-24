import { useState } from 'react';
import { useMenuReviews } from '../../../hooks/useMenuReviews';
import { formatKoreanDate, getKoreanDateString } from '../../../utils/koreanDate';
import ReviewSummary from './ReviewSummary';
import ReviewForm from './ReviewForm';

export default function MenuReviews({ restaurants = [], menuData = [] }) {
  const [selectedMealType, setSelectedMealType] = useState('점심');
  const [reviewingItem, setReviewingItem] = useState(null); // { restaurant, mealType }

  const {
    loading,
    submitting,
    error,
    submitReview,
    getRating,
    hasReviewed,
    getReviewsFor,
  } = useMenuReviews(restaurants);

  const today = getKoreanDateString();

  // Get restaurants that have menus for selected meal type
  const getRestaurantsWithMenu = () => {
    return restaurants.filter(name => {
      const data = menuData.find(d => d.name === name);
      if (!data?.data?.menus) return false;

      // Check if any day has this meal type
      const menus = data.data.menus;
      return Object.values(menus).some(dayMenu => {
        if (Array.isArray(dayMenu)) return selectedMealType === '점심';
        return dayMenu && dayMenu[selectedMealType];
      });
    });
  };

  const handleSubmitReview = async (reviewData) => {
    const result = await submitReview(reviewData);
    if (result.success) {
      setReviewingItem(null);
    }
    return result;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const availableRestaurants = getRestaurantsWithMenu();

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-1">
          메뉴 리뷰
        </h3>
        <p className="text-sm text-slate-500">
          {formatKoreanDate(today)} 메뉴에 별점과 한줄평을 남겨보세요
        </p>
      </div>

      {/* Meal type toggle */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setSelectedMealType('점심')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedMealType === '점심'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🌞 점심
        </button>
        <button
          onClick={() => setSelectedMealType('저녁')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedMealType === '저녁'
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🌙 저녁
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      {/* Review form (if writing) */}
      {reviewingItem && (
        <div className="mb-6">
          <ReviewForm
            restaurantName={reviewingItem.restaurant}
            mealType={reviewingItem.mealType}
            onSubmit={handleSubmitReview}
            onCancel={() => setReviewingItem(null)}
            submitting={submitting}
          />
        </div>
      )}

      {/* Restaurant review summaries */}
      {availableRestaurants.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          {selectedMealType} 메뉴가 있는 식당이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {availableRestaurants.map((name) => (
            <ReviewSummary
              key={`${name}_${selectedMealType}`}
              restaurantName={name}
              mealType={selectedMealType}
              rating={getRating(name, selectedMealType)}
              reviews={getReviewsFor(name, selectedMealType)}
              hasReviewed={hasReviewed(name, selectedMealType)}
              onWriteReview={() => setReviewingItem({ restaurant: name, mealType: selectedMealType })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
