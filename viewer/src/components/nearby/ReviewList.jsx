/**
 * 리뷰 목록 컴포넌트
 */

import { useState } from 'react';
import { toggleReviewHelpful } from '../../utils/nearbyRestaurantApi';

const ReviewList = ({ reviews, user }) => {
  const [helpfulStates, setHelpfulStates] = useState({});

  const handleHelpful = async (reviewId) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const result = await toggleReviewHelpful(reviewId, user.id);
      setHelpfulStates((prev) => ({
        ...prev,
        [reviewId]: result.helpful,
      }));
    } catch (err) {
      console.error('도움됨 토글 실패:', err);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    if (days < 365) return `${Math.floor(days / 30)}개월 전`;
    return `${Math.floor(days / 365)}년 전`;
  };

  if (reviews.length === 0) {
    return <p className="text-center text-slate-500 py-8">아직 등록된 리뷰가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isHelpful = helpfulStates[review.id] ?? false;

        return (
          <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {/* 아바타 */}
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-sm text-slate-500">
                    {review.user?.raw_user_meta_data?.nickname?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {review.user?.raw_user_meta_data?.nickname || '익명'}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500 text-xs">
                      {'★'.repeat(Math.floor(review.rating))}
                      {'☆'.repeat(5 - Math.floor(review.rating))}
                    </span>
                    {review.is_verified && (
                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                        인증됨
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
            </div>

            {/* 제목 */}
            {review.title && (
              <h4 className="font-medium text-slate-800 mb-1">{review.title}</h4>
            )}

            {/* 내용 */}
            {review.content && (
              <p className="text-sm text-slate-600 mb-2">{review.content}</p>
            )}

            {/* 사진 */}
            {review.photo_urls && review.photo_urls.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                {review.photo_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`리뷰 사진 ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            )}

            {/* 태그 */}
            {review.tags && review.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {review.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 도움됨 버튼 */}
            <button
              onClick={() => handleHelpful(review.id)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isHelpful
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              <span>도움이 됐어요 {review.helpful_count > 0 && `(${review.helpful_count})`}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewList;
