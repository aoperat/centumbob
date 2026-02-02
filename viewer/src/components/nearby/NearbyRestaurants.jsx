/**
 * 주변 식당 추천 커뮤니티 - 메인 컴포넌트
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getNearbyRestaurants,
  getConstants,
  formatDistance,
  calculateWalkTime,
  getPriceRangeLabel,
} from '../../utils/nearbyRestaurantApi';
import RestaurantCard from './RestaurantCard';
import RestaurantDetail from './RestaurantDetail';
import RestaurantForm from './RestaurantForm';
import TodayPoll from './TodayPoll';

const NearbyRestaurants = ({ userLocation, user }) => {
  // 상태
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [constants, setConstants] = useState({ categories: [], priceRanges: [], tags: {} });

  // 필터 상태
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    sort: 'distance',
  });
  const [showFilters, setShowFilters] = useState(false);

  // 모달 상태
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // 뷰 모드
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'poll'

  // 상수 데이터 로드
  useEffect(() => {
    const loadConstants = async () => {
      try {
        const data = await getConstants();
        setConstants(data);
      } catch (err) {
        console.error('상수 로드 실패:', err);
      }
    };
    loadConstants();
  }, []);

  // 식당 목록 로드
  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
        radius: 2000,
        sort: filters.sort,
      };

      if (filters.category) params.category = filters.category;
      if (filters.priceRange) params.priceRange = filters.priceRange;

      const result = await getNearbyRestaurants(params);
      setRestaurants(result.restaurants || []);
    } catch (err) {
      console.error('식당 목록 로드 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation, filters]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  // 필터 변경 핸들러
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // 식당 등록 완료 핸들러
  const handleRestaurantAdded = () => {
    setShowAddForm(false);
    loadRestaurants();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* 뷰 모드 탭 */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              맛집 리스트
            </button>
            <button
              onClick={() => setViewMode('poll')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'poll'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              오늘의 투표
            </button>
          </div>

          {/* 필터 (리스트 뷰에서만) */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              {/* 정렬 */}
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="distance">거리순</option>
                <option value="rating">별점순</option>
                <option value="review_count">리뷰순</option>
                <option value="newest">최신순</option>
              </select>

              {/* 필터 버튼 */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                  showFilters || filters.category || filters.priceRange
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                필터
                {(filters.category || filters.priceRange) && (
                  <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block" />
                )}
              </button>

              {/* 식당 등록 버튼 */}
              <button
                onClick={() => {
                  if (user) {
                    setShowAddForm(true);
                  } else {
                    alert('로그인 후 식당을 등록할 수 있습니다.');
                  }
                }}
                className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                + 등록
              </button>
            </div>
          )}

          {/* 확장 필터 */}
          {viewMode === 'list' && showFilters && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg space-y-2">
              {/* 카테고리 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">카테고리</label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      !filters.category
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    전체
                  </button>
                  {constants.categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleFilterChange('category', cat)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        filters.category === cat
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 가격대 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">가격대</label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleFilterChange('priceRange', '')}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      !filters.priceRange
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    전체
                  </button>
                  {constants.priceRanges.map((pr) => (
                    <button
                      key={pr.value}
                      onClick={() => handleFilterChange('priceRange', pr.value)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        filters.priceRange === pr.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 필터 초기화 */}
              {(filters.category || filters.priceRange) && (
                <button
                  onClick={() => {
                    handleFilterChange('category', '');
                    handleFilterChange('priceRange', '');
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {viewMode === 'list' ? (
          <>
            {/* 로딩 */}
            {loading && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            )}

            {/* 에러 */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={loadRestaurants}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* 식당 목록 */}
            {!loading && !error && (
              <>
                {restaurants.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 mb-4">
                      {filters.category || filters.priceRange
                        ? '조건에 맞는 식당이 없습니다.'
                        : '등록된 식당이 없습니다.'}
                    </p>
                    {user ? (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        첫 번째 식당 등록하기
                      </button>
                    ) : (
                      <p className="text-sm text-slate-400">
                        로그인 후 식당을 등록할 수 있습니다.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {restaurants.map((restaurant) => (
                      <RestaurantCard
                        key={restaurant.id}
                        restaurant={restaurant}
                        onClick={() => setSelectedRestaurant(restaurant)}
                        user={user}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <TodayPoll user={user} />
        )}
      </div>

      {/* 식당 상세 모달 */}
      {selectedRestaurant && (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          user={user}
          onClose={() => setSelectedRestaurant(null)}
          onUpdate={loadRestaurants}
        />
      )}

      {/* 식당 등록 모달 */}
      {showAddForm && (
        <RestaurantForm
          user={user}
          constants={constants}
          userLocation={userLocation}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleRestaurantAdded}
        />
      )}
    </div>
  );
};

export default NearbyRestaurants;
