import { StarRatingDisplay } from './StarRating';
import { getRelativeTime } from '../../../utils/koreanDate';

export default function ReviewSummary({
  restaurantName,
  mealType,
  rating,
  reviews = [],
  hasReviewed = false,
  onWriteReview,
}) {
  const { average, count } = rating;
  const recentReviews = reviews.slice(0, 3);

  return (
    <div className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-slate-800">{restaurantName}</span>
          <span className={`
            ml-2 text-xs px-2 py-0.5 rounded-full
            ${mealType === '점심' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}
          `}>
            {mealType}
          </span>
        </div>

        {/* Rating display */}
        {count > 0 ? (
          <StarRatingDisplay average={average} count={count} />
        ) : (
          <span className="text-sm text-slate-400">리뷰 없음</span>
        )}
      </div>

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <div className="space-y-2 mb-3">
          {recentReviews.map((review) => (
            <div key={review.id} className="text-sm bg-slate-50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex text-yellow-400">
                  {Array.from({ length: review.rating }, (_, i) => (
                    <svg key={i} className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-slate-400 text-xs">
                  {review.display_name} · {getRelativeTime(review.created_at)}
                </span>
              </div>
              {review.comment && (
                <p className="text-slate-600">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Write review button */}
      {!hasReviewed ? (
        <button
          onClick={onWriteReview}
          className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          리뷰 작성하기
        </button>
      ) : (
        <div className="text-center text-sm text-green-600 bg-green-50 rounded-lg py-2">
          ✓ 리뷰를 작성했습니다
        </div>
      )}
    </div>
  );
}
