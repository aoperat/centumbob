/**
 * 식당 카드 컴포넌트
 */

import { useState } from 'react';
import {
  formatDistance,
  calculateWalkTime,
  getPriceRangeLabel,
  toggleBookmark,
} from '../../utils/nearbyRestaurantApi';

const RestaurantCard = ({ restaurant, onClick, user }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const handleBookmarkClick = async (e) => {
    e.stopPropagation();

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setBookmarkLoading(true);
    try {
      const result = await toggleBookmark(restaurant.id, user.id);
      setIsBookmarked(result.bookmarked);
    } catch (err) {
      console.error('찜하기 실패:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start">
        {/* 식당 정보 */}
        <div className="flex-1 min-w-0">
          {/* 이름 & 카테고리 */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 truncate">{restaurant.name}</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
              {restaurant.category}
            </span>
          </div>

          {/* 별점 & 리뷰수 & 가격대 */}
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-yellow-500">
              {'★'.repeat(Math.floor(restaurant.avg_rating || 0))}
              {'☆'.repeat(5 - Math.floor(restaurant.avg_rating || 0))}
            </span>
            <span className="text-slate-600">
              {restaurant.avg_rating?.toFixed(1) || '0.0'}
            </span>
            <span className="text-slate-400">({restaurant.review_count || 0})</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{getPriceRangeLabel(restaurant.price_range)}</span>
          </div>

          {/* 거리 */}
          {restaurant.distance && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{formatDistance(restaurant.distance)}</span>
              <span className="text-slate-300">·</span>
              <span>{calculateWalkTime(restaurant.distance)}</span>
            </div>
          )}

          {/* 태그 */}
          {restaurant.tags && restaurant.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {restaurant.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {restaurant.tags.length > 3 && (
                <span className="text-xs text-slate-400">+{restaurant.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* 찜하기 버튼 */}
        <button
          onClick={handleBookmarkClick}
          disabled={bookmarkLoading}
          className={`p-2 rounded-full transition-colors ${
            isBookmarked
              ? 'text-red-500 bg-red-50 hover:bg-red-100'
              : 'text-slate-400 hover:text-red-500 hover:bg-slate-100'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill={isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default RestaurantCard;
