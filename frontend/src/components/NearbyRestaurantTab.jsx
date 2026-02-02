/**
 * 주변맛집 관리 탭 - 관리자용
 */

import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9101/api/nearby-restaurants';

// 카테고리 및 가격대 상수
const CATEGORIES = [
  '한식', '중식', '일식', '양식', '분식',
  '패스트푸드', '카페', '베이커리', '아시안', '기타'
];

const PRICE_RANGES = [
  { value: 'under_10k', label: '1만원 미만' },
  { value: '10k_15k', label: '1-1.5만원' },
  { value: '15k_20k', label: '1.5-2만원' },
  { value: 'over_20k', label: '2만원 이상' },
];

const TAGS = {
  atmosphere: ['조용해요', '활기차요', '분위기좋아요', '깔끔해요'],
  convenience: ['주차가능', '혼밥가능', '단체가능', '예약가능', '포장가능'],
  feature: ['가성비좋아요', '양많아요', '맛있어요', '친절해요'],
  notice: ['웨이팅있어요', '현금만', '브레이크타임있어요'],
};

const NearbyRestaurantTab = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 폼 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    category: '한식',
    price_range: 'under_10k',
    phone: '',
    business_hours: '',
    description: '',
    tags: [],
    image_url: '',
    naver_map_url: '',
    kakao_map_url: '',
  });

  // 필터 상태
  const [filter, setFilter] = useState({
    category: '',
    search: '',
  });

  // 식당 목록 불러오기
  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}?limit=100`);
      if (!response.ok) throw new Error('식당 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setRestaurants(data.restaurants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      category: '한식',
      price_range: 'under_10k',
      phone: '',
      business_hours: '',
      description: '',
      tags: [],
      image_url: '',
      naver_map_url: '',
      kakao_map_url: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // 식당 등록/수정
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '저장에 실패했습니다.');
      }

      alert(editingId ? '식당이 수정되었습니다.' : '식당이 등록되었습니다.');
      resetForm();
      fetchRestaurants();
    } catch (err) {
      alert(err.message);
    }
  };

  // 식당 삭제
  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제에 실패했습니다.');

      alert('식당이 삭제되었습니다.');
      fetchRestaurants();
    } catch (err) {
      alert(err.message);
    }
  };

  // 수정 모드
  const handleEdit = (restaurant) => {
    setFormData({
      name: restaurant.name || '',
      address: restaurant.address || '',
      latitude: String(restaurant.latitude || ''),
      longitude: String(restaurant.longitude || ''),
      category: restaurant.category || '한식',
      price_range: restaurant.price_range || 'under_10k',
      phone: restaurant.phone || '',
      business_hours: restaurant.business_hours || '',
      description: restaurant.description || '',
      tags: restaurant.tags || [],
      image_url: restaurant.image_url || '',
      naver_map_url: restaurant.naver_map_url || '',
      kakao_map_url: restaurant.kakao_map_url || '',
    });
    setEditingId(restaurant.id);
    setIsFormOpen(true);
  };

  // 태그 토글
  const toggleTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // 필터링된 식당 목록
  const filteredRestaurants = restaurants.filter(r => {
    if (filter.category && r.category !== filter.category) return false;
    if (filter.search && !r.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // 가격대 라벨 변환
  const getPriceLabel = (value) => {
    const found = PRICE_RANGES.find(p => p.value === value);
    return found ? found.label : value;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">주변맛집 관리</h2>
          <p className="text-sm text-slate-500 mt-1">
            총 {restaurants.length}개의 식당이 등록되어 있습니다.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          식당 추가
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex-1">
          <input
            type="text"
            placeholder="식당 이름 검색..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filter.category}
          onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* 식당 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">식당명</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">카테고리</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">가격대</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">주소</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">평점</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRestaurants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  등록된 식당이 없습니다.
                </td>
              </tr>
            ) : (
              filteredRestaurants.map(restaurant => (
                <tr key={restaurant.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                          🍽️
                        </div>
                      )}
                      <span className="font-medium text-slate-800">{restaurant.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {restaurant.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {getPriceLabel(restaurant.price_range)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {restaurant.address}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium">
                        {restaurant.avg_rating?.toFixed(1) || '-'}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({restaurant.review_count || 0})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(restaurant)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(restaurant.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 식당 등록/수정 모달 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? '식당 수정' : '새 식당 등록'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700 border-b pb-2">기본 정보</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      식당명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="051-000-0000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      위도 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      placeholder="35.1796"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      경도 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      placeholder="129.0756"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      카테고리 <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      가격대 <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.price_range}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {PRICE_RANGES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">영업시간</label>
                  <input
                    type="text"
                    value={formData.business_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_hours: e.target.value }))}
                    placeholder="11:00 - 21:00 (브레이크타임 15:00-17:00)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 태그 */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700 border-b pb-2">태그</h4>

                {Object.entries(TAGS).map(([category, tags]) => (
                  <div key={category}>
                    <p className="text-xs text-slate-500 mb-2 capitalize">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            formData.tags.includes(tag)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 링크 */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700 border-b pb-2">링크</h4>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">이미지 URL</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">네이버 지도 URL</label>
                  <input
                    type="url"
                    value={formData.naver_map_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, naver_map_url: e.target.value }))}
                    placeholder="https://map.naver.com/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">카카오맵 URL</label>
                  <input
                    type="url"
                    value={formData.kakao_map_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, kakao_map_url: e.target.value }))}
                    placeholder="https://place.map.kakao.com/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingId ? '수정하기' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyRestaurantTab;
