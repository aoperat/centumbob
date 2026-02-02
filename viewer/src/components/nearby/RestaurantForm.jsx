/**
 * 식당 등록/수정 폼 컴포넌트
 */

import { useState } from 'react';
import { createRestaurant } from '../../utils/nearbyRestaurantApi';

const RestaurantForm = ({ user, constants, userLocation, onClose, onSubmit, restaurant }) => {
  const isEdit = !!restaurant;

  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    address: restaurant?.address || '',
    latitude: restaurant?.latitude || '',
    longitude: restaurant?.longitude || '',
    category: restaurant?.category || '',
    price_range: restaurant?.price_range || '',
    representative_menus: restaurant?.representative_menus?.join(', ') || '',
    phone: restaurant?.phone || '',
    tags: restaurant?.tags || [],
    business_hours: restaurant?.business_hours || {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // 현재 위치 가져오기
  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setFormData((prev) => ({
        ...prev,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }));
      return;
    }

    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setLocationLoading(false);
        },
        (err) => {
          setError('위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인해주세요.');
          setLocationLoading(false);
        }
      );
    } else {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      setLocationLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

    // 필수 필드 검증
    if (!formData.name || !formData.address || !formData.category || !formData.price_range) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError('위치 정보를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        representative_menus: formData.representative_menus
          ? formData.representative_menus.split(',').map((m) => m.trim()).filter(Boolean)
          : [],
        created_by: user?.id,
      };

      await createRestaurant(submitData);
      onSubmit?.();
    } catch (err) {
      console.error('식당 등록 실패:', err);
      setError(err.message || '식당 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모든 태그 평탄화
  const allTags = Object.values(constants.tags || {}).flat();

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
            <h2 className="font-semibold text-lg text-slate-800">
              {isEdit ? '식당 수정' : '식당 등록'}
            </h2>
            <div className="w-10" />
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            {/* 식당명 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                식당명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="식당 이름을 입력하세요"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="도로명 주소를 입력하세요"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 위치 정보 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                위치 <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className={`w-full py-3 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  formData.latitude && formData.longitude
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500'
                }`}
              >
                {locationLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    <span>위치 확인 중...</span>
                  </>
                ) : formData.latitude && formData.longitude ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>위치 설정됨 (다시 클릭하여 갱신)</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>현재 위치 사용하기</span>
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 mt-1">
                식당이 있는 위치에서 버튼을 눌러주세요. GPS 기반으로 자동 설정됩니다.
              </p>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(constants.categories || []).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      formData.category === cat
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 가격대 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                가격대 <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(constants.priceRanges || []).map((pr) => (
                  <button
                    key={pr.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, price_range: pr.value }))}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      formData.price_range === pr.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 대표 메뉴 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">대표 메뉴</label>
              <input
                type="text"
                name="representative_menus"
                value={formData.representative_menus}
                onChange={handleChange}
                placeholder="쉼표로 구분 (예: 김치찌개, 된장찌개, 제육볶음)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="051-123-4567"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">특징 태그</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
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
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '등록 중...' : isEdit ? '수정하기' : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RestaurantForm;
