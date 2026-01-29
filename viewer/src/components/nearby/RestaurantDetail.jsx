/**
 * 식당 상세 모달 컴포넌트
 */

import { useState, useEffect } from 'react';
import {
  getRestaurantById,
  getRestaurantReviews,
  getTips,
  formatDistance,
  calculateWalkTime,
  getPriceRangeLabel,
  toggleBookmark,
  checkBookmark,
} from '../../utils/nearbyRestaurantApi';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';

const RestaurantDetail = ({ restaurant: initialRestaurant, user, onClose, onUpdate }) => {
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [reviews, setReviews] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'reviews' | 'tips'
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 상세 정보 로드
  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const [restaurantData, reviewsData, tipsData] = await Promise.all([
          getRestaurantById(restaurant.id),
          getRestaurantReviews(restaurant.id),
          getTips({ restaurantId: restaurant.id }),
        ]);

        setRestaurant(restaurantData);
        setReviews(reviewsData.reviews || []);
        setTips(tipsData || []);

        // 찜 여부 확인
        if (user) {
          const bookmarkStatus = await checkBookmark(restaurant.id, user.id);
          setIsBookmarked(bookmarkStatus.bookmarked);
        }
      } catch (err) {
        console.error('상세 정보 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [restaurant.id, user]);

  // 찜하기 토글
  const handleBookmark = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const result = await toggleBookmark(restaurant.id, user.id);
      setIsBookmarked(result.bookmarked);
    } catch (err) {
      console.error('찜하기 실패:', err);
    }
  };

  // 리뷰 작성 완료
  const handleReviewSubmitted = async () => {
    setShowReviewForm(false);
    const reviewsData = await getRestaurantReviews(restaurant.id);
    setReviews(reviewsData.reviews || []);
    const restaurantData = await getRestaurantById(restaurant.id);
    setRestaurant(restaurantData);
    onUpdate?.();
  };

  // 외부 링크 열기
  const openExternalLink = (type) => {
    const links = restaurant.external_links || {};
    if (links[type]) {
      window.open(links[type], '_blank');
    } else if (type === 'naver') {
      window.open(
        `https://map.naver.com/v5/search/${encodeURIComponent(restaurant.name)}`,
        '_blank'
      );
    } else if (type === 'kakao') {
      window.open(
        `https://map.kakao.com/?q=${encodeURIComponent(restaurant.name)}`,
        '_blank'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 컨텐츠 */}
      <div className="relative min-h-screen flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="relative w-full md:max-w-lg bg-white md:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* 헤더 */}
          <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
            <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-semibold text-lg text-slate-800">{restaurant.name}</h2>
            <button
              onClick={handleBookmark}
              className={`p-2 -mr-2 rounded-full ${
                isBookmarked ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              <svg
                className="w-6 h-6"
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

          {/* 로딩 */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* 탭 */}
              <div className="flex border-b border-slate-200">
                {[
                  { key: 'info', label: '정보' },
                  { key: 'reviews', label: `리뷰 (${reviews.length})` },
                  { key: 'tips', label: `꿀팁 (${tips.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 탭 컨텐츠 */}
              <div className="flex-1 overflow-y-auto">
                {/* 정보 탭 */}
                {activeTab === 'info' && (
                  <div className="p-4 space-y-4">
                    {/* 기본 정보 */}
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-lg">
                        {'★'.repeat(Math.floor(restaurant.avg_rating || 0))}
                        {'☆'.repeat(5 - Math.floor(restaurant.avg_rating || 0))}
                      </span>
                      <span className="font-semibold">
                        {restaurant.avg_rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-slate-400">({restaurant.review_count || 0}개 리뷰)</span>
                    </div>

                    {/* 카테고리 & 가격대 */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                        {restaurant.category}
                      </span>
                      <span className="bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                        {getPriceRangeLabel(restaurant.price_range)}
                      </span>
                    </div>

                    {/* 주소 & 거리 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-slate-700">{restaurant.address}</p>
                          {restaurant.distance && (
                            <p className="text-slate-500">
                              {formatDistance(restaurant.distance)} · {calculateWalkTime(restaurant.distance)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 전화번호 */}
                      {restaurant.phone && (
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:underline">
                            {restaurant.phone}
                          </a>
                        </div>
                      )}

                      {/* 영업시간 */}
                      {restaurant.business_hours && (
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-slate-700">
                            {restaurant.business_hours.lunch_start && (
                              <p>점심 {restaurant.business_hours.lunch_start} - {restaurant.business_hours.lunch_end}</p>
                            )}
                            {restaurant.business_hours.dinner_start && (
                              <p>저녁 {restaurant.business_hours.dinner_start} - {restaurant.business_hours.dinner_end}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 대표 메뉴 */}
                    {restaurant.representative_menus && restaurant.representative_menus.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">대표 메뉴</h4>
                        <div className="flex flex-wrap gap-2">
                          {restaurant.representative_menus.map((menu, i) => (
                            <span key={i} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                              {menu}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 태그 */}
                    {restaurant.tags && restaurant.tags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">특징</h4>
                        <div className="flex flex-wrap gap-2">
                          {restaurant.tags.map((tag) => (
                            <span key={tag} className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 외부 링크 */}
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => openExternalLink('naver')}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                      >
                        네이버 지도
                      </button>
                      <button
                        onClick={() => openExternalLink('kakao')}
                        className="flex-1 py-2 bg-yellow-400 text-yellow-900 rounded-lg text-sm font-medium hover:bg-yellow-500"
                      >
                        카카오맵
                      </button>
                    </div>
                  </div>
                )}

                {/* 리뷰 탭 */}
                {activeTab === 'reviews' && (
                  <div className="p-4">
                    {/* 리뷰 작성 버튼 */}
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="w-full py-3 mb-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors"
                    >
                      + 리뷰 작성하기
                    </button>

                    {/* 리뷰 목록 */}
                    <ReviewList reviews={reviews} user={user} />
                  </div>
                )}

                {/* 꿀팁 탭 */}
                {activeTab === 'tips' && (
                  <div className="p-4">
                    {tips.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">아직 등록된 꿀팁이 없습니다.</p>
                    ) : (
                      <div className="space-y-3">
                        {tips.map((tip) => (
                          <div key={tip.id} className="bg-slate-50 rounded-lg p-3">
                            <h4 className="font-medium text-slate-800">{tip.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">{tip.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <span>👍 {tip.like_count}</span>
                              <span>💬 {tip.comment_count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 리뷰 작성 폼 */}
      {showReviewForm && (
        <ReviewForm
          restaurantId={restaurant.id}
          user={user}
          onClose={() => setShowReviewForm(false)}
          onSubmit={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default RestaurantDetail;
