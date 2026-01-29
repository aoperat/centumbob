/**
 * 리뷰 작성 폼 컴포넌트
 */

import { useState } from 'react';
import { createReview } from '../../utils/nearbyRestaurantApi';

const REVIEW_TAGS = [
  '맛있어요',
  '가성비좋아요',
  '양많아요',
  '친절해요',
  '분위기좋아요',
  '깔끔해요',
  '혼밥가능',
  '웨이팅있어요',
];

const ReviewForm = ({ restaurantId, user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    content: '',
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleTagToggle = (tag) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!formData.content.trim()) {
      setError('리뷰 내용을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      await createReview({
        restaurant_id: restaurantId,
        user_id: user.id,
        rating: formData.rating,
        title: formData.title.trim() || null,
        content: formData.content.trim(),
        tags: formData.tags,
      });
      onSubmit?.();
    } catch (err) {
      console.error('리뷰 작성 실패:', err);
      setError(err.message || '리뷰 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 컨텐츠 */}
      <div className="relative min-h-screen flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="relative w-full md:max-w-md bg-white md:rounded-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-semibold text-lg text-slate-800">리뷰 작성</h2>
            <div className="w-10" />
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            {/* 별점 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">별점</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    className="text-3xl transition-colors"
                  >
                    <span className={formData.rating >= star ? 'text-yellow-400' : 'text-slate-200'}>
                      ★
                    </span>
                  </button>
                ))}
                <span className="ml-2 text-lg font-medium text-slate-700">
                  {formData.rating}.0
                </span>
              </div>
            </div>

            {/* 한줄 제목 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                한줄 제목 (선택)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="한줄로 요약해주세요"
                maxLength={50}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 리뷰 내용 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                리뷰 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="음식, 서비스, 분위기 등에 대해 솔직하게 작성해주세요"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-slate-400 text-right mt-1">
                {formData.content.length}/500
              </p>
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                이 식당의 특징은? (선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !formData.content.trim()}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '등록 중...' : '리뷰 등록'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm;
