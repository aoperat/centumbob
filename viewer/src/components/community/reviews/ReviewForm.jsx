import { useState } from 'react';
import StarRating from './StarRating';

export default function ReviewForm({
  restaurantName,
  mealType,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError('별점을 선택해주세요.');
      return;
    }

    const result = await onSubmit({
      restaurantName,
      mealType,
      rating,
      comment: comment.trim() || null,
    });

    if (result.success) {
      setRating(0);
      setComment('');
      setError('');
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-medium text-slate-700">{restaurantName}</span>
            <span className="ml-2 text-sm text-slate-500">{mealType}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            취소
          </button>
        </div>

        {/* Star rating */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-2">별점</label>
          <StarRating
            rating={rating}
            size="lg"
            interactive
            onRatingChange={setRating}
          />
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block text-sm text-slate-600 mb-2">한줄평 (선택)</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={200}
            placeholder="오늘 메뉴 어땠나요?"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {comment.length}/200
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-red-500 text-sm mb-3">{error}</div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className={`
            w-full py-2 rounded-lg text-sm font-medium transition-colors
            ${rating > 0 && !submitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {submitting ? '제출 중...' : '리뷰 등록'}
        </button>
      </div>
    </form>
  );
}
