import { useState, useEffect } from 'react';
import { IconTrash, IconPlus, IconCheck, IconX, IconRefreshCw } from './Icons';
import { getWeekDateRange, getTotalWeeks } from '../utils/dateUtils';
import { getDateRanges, addDateRange as addDateRangeAPI, updateDateRange, deleteDateRange as deleteDateRangeAPI, deleteAllMenuDataByRestaurantId } from '../utils/api';

const API_BASE_URL = '/api';

const ManagementTab = ({ 
  restaurants, // 상위 컴포넌트에서 전달받은 식당 목록 (문자열 배열) - 호환성 위해 유지하지만 내부적으로는 API 사용
  setRestaurants, // 상위 상태 업데이트용
  dateRanges, 
  setDateRanges 
}) => {
  const [dbRestaurants, setDbRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dbDateRanges, setDbDateRanges] = useState([]);
  const [isLoadingDateRanges, setIsLoadingDateRanges] = useState(false);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    building_name: '',
    price_lunch: '',
    price_dinner: '',
    has_dinner: true,
    webhook_url: '',
    webhook_type: '', // 'image' | 'json' | ''
    use_all_days: true
  });

  // 날짜 관련 상태
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // 식당 목록 불러오기
  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/restaurants`);
      if (!response.ok) throw new Error('식당 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setDbRestaurants(data);
      
      // 상위 컴포넌트 상태도 업데이트 (이름만 추출)
      const names = data.filter(r => r.is_active).map(r => r.name);
      setRestaurants(names);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      alert('식당 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
    fetchDateRanges();
  }, []);

  // 날짜 범위 목록 불러오기
  const fetchDateRanges = async () => {
    setIsLoadingDateRanges(true);
    try {
      const data = await getDateRanges(false); // 모든 날짜 범위 조회
      setDbDateRanges(data);
      
      // 상위 컴포넌트 상태도 업데이트 (활성 날짜 범위만)
      const activeRanges = data.filter(dr => dr.is_active === true || dr.is_active === 1).map(dr => dr.date_range);
      setDateRanges(activeRanges);
    } catch (error) {
      console.error('Error fetching date ranges:', error);
      alert('날짜 범위 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingDateRanges(false);
    }
  };

  // 모달 열기 (추가/수정)
  const openModal = (restaurant = null) => {
    if (restaurant) {
      setEditingId(restaurant.id);
      setFormData({
        name: restaurant.name,
        building_name: restaurant.building_name || '',
        price_lunch: restaurant.price_lunch || '',
        price_dinner: restaurant.price_dinner || '',
        has_dinner: restaurant.has_dinner === true || restaurant.has_dinner === 1,
        webhook_url: restaurant.webhook_url || '',
        webhook_type: restaurant.webhook_type || '',
        use_all_days: restaurant.use_all_days === undefined ? true : (restaurant.use_all_days === true || restaurant.use_all_days === 1)
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        building_name: '',
        price_lunch: '',
        price_dinner: '',
        has_dinner: true,
        webhook_url: '',
        webhook_type: '',
        use_all_days: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  // 식당 저장 (추가/수정)
  const handleSaveRestaurant = async () => {
    if (!formData.name.trim()) return alert('식당 이름을 입력해주세요.');

    try {
      const url = editingId 
        ? `${API_BASE_URL}/restaurants/${editingId}`
        : `${API_BASE_URL}/restaurants`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '저장에 실패했습니다.');
      }

      await fetchRestaurants();
      closeModal();
    } catch (error) {
      console.error('Error saving restaurant:', error);
      alert(error.message);
    }
  };

  // 식당 삭제
  const handleDeleteRestaurant = async (id, name) => {
    if (!confirm(`정말 '${name}' 식당을 삭제하시겠습니까?\n해당 식당의 모든 메뉴 데이터도 함께 삭제됩니다.`)) return;

    try {
      // 먼저 메뉴 데이터 삭제 (restaurant_id 기반)
      await deleteAllMenuDataByRestaurantId(id);

      // 그 다음 식당 삭제
      const response = await fetch(`${API_BASE_URL}/restaurants/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('삭제에 실패했습니다.');

      await fetchRestaurants();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 날짜 범위 관리 (년도+주차 기반, DB 연동)
  const addDateRange = async () => {
    try {
      const weekInfo = getWeekDateRange(selectedYear, selectedWeek);
      const newDateRange = weekInfo.dateRange;
      
      // 중복 체크
      if (dbDateRanges.some(dr => dr.date_range === newDateRange)) {
        alert('이미 등록된 날짜 범위입니다.');
        return;
      }
      
      await addDateRangeAPI(newDateRange, selectedYear, selectedWeek);
      await fetchDateRanges(); // 목록 새로고침
    } catch (error) {
      alert(`날짜 범위 추가 실패: ${error.message}`);
    }
  };

  // 해당 년도의 총 주차 수
  const totalWeeks = getTotalWeeks(selectedYear);

  // 날짜 범위 삭제
  const handleDeleteDateRange = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    try {
      await deleteDateRangeAPI(id);
      await fetchDateRanges(); // 목록 새로고침
    } catch (error) {
      alert(`날짜 범위 삭제 실패: ${error.message}`);
    }
  };

  // 날짜 범위 사용 여부 토글
  const handleToggleDateRangeActive = async (id, currentActive) => {
    try {
      await updateDateRange(id, { is_active: !(currentActive === true || currentActive === 1) });
      await fetchDateRanges(); // 목록 새로고침
    } catch (error) {
      alert(`날짜 범위 상태 변경 실패: ${error.message}`);
    }
  };

  return (
    <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar fade-in bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 식당 관리 섹션 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">식당 기준 정보 관리</h3>
              <p className="text-xs text-slate-500">식당 목록과 기본 가격 정보를 관리합니다.</p>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <IconPlus size={16} />
              새 식당 추가
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-bold">ID</th>
                  <th className="px-6 py-3 font-bold">식당 이름</th>
                  <th className="px-6 py-3 font-bold">건물명</th>
                  <th className="px-6 py-3 font-bold">점심 가격</th>
                  <th className="px-6 py-3 font-bold">저녁 가격</th>
                  <th className="px-6 py-3 font-bold text-center">저녁 제공</th>
                  <th className="px-6 py-3 font-bold text-center">요일 모드</th>
                  <th className="px-6 py-3 font-bold text-center">웹훅</th>
                  <th className="px-6 py-3 font-bold text-center">상태</th>
                  <th className="px-6 py-3 font-bold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <IconRefreshCw className="animate-spin" /> 로딩 중...
                      </div>
                    </td>
                  </tr>
                ) : dbRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-500">등록된 식당이 없습니다.</td>
                  </tr>
                ) : (
                  dbRestaurants.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{res.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{res.name}</td>
                      <td className="px-6 py-4 text-slate-600">{res.building_name || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{res.price_lunch || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{res.price_dinner || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${res.has_dinner ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                          {res.has_dinner ? '제공' : '미제공'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${(res.use_all_days === undefined || res.use_all_days === true || res.use_all_days === 1) ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                          {(res.use_all_days === undefined || res.use_all_days === true || res.use_all_days === 1) ? '전체 요일' : '개별 요일'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {res.webhook_url ? (
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            res.webhook_type === 'image'
                              ? 'bg-cyan-100 text-cyan-700'
                              : res.webhook_type === 'json'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {res.webhook_type === 'image' ? '이미지' : res.webhook_type === 'json' ? 'JSON' : '설정됨'}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${res.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openModal(res)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(res.id, res.name)}
                          className="text-red-500 hover:text-red-700 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 날짜 관리 섹션 (기존 유지) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">날짜 범위 관리</h3>
              <p className="text-xs text-slate-500">주간 식단표의 날짜 범위를 미리 등록해두세요.</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">년도</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const year = parseInt(e.target.value, 10);
                    setSelectedYear(year);
                    const maxWeek = getTotalWeeks(year);
                    if (selectedWeek > maxWeek) {
                      setSelectedWeek(1);
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all bg-white"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 1 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">주차</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all bg-white"
                >
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                    <option key={week} value={week}>
                      {week}주차
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={addDateRange}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>
            {(() => {
              try {
                const weekInfo = getWeekDateRange(selectedYear, selectedWeek);
                return (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">예상 날짜 범위:</p>
                    <p className="text-sm font-bold text-slate-700">{weekInfo.dateRange}</p>
                  </div>
                );
              } catch (error) {
                return null;
              }
            })()}
            
            {/* 날짜 범위 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-bold">날짜 범위</th>
                    <th className="px-6 py-3 font-bold">년도</th>
                    <th className="px-6 py-3 font-bold">주차</th>
                    <th className="px-6 py-3 font-bold text-center">사용 여부</th>
                    <th className="px-6 py-3 font-bold text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingDateRanges ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                        <div className="flex justify-center items-center gap-2">
                          <IconRefreshCw className="animate-spin" /> 로딩 중...
                        </div>
                      </td>
                    </tr>
                  ) : dbDateRanges.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500">등록된 날짜 범위가 없습니다.</td>
                    </tr>
                  ) : (
                    dbDateRanges.map((dr) => (
                      <tr key={dr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{dr.date_range}</td>
                        <td className="px-6 py-4 text-slate-600">{dr.year}년</td>
                        <td className="px-6 py-4 text-slate-600">{dr.week}주차</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleDateRangeActive(dr.id, dr.is_active)}
                            className={`inline-block px-3 py-1 rounded text-xs font-bold transition-colors ${
                              (dr.is_active === true || dr.is_active === 1)
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {(dr.is_active === true || dr.is_active === 1) ? '사용' : '미사용'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteDateRange(dr.id)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 식당 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingId ? '식당 정보 수정' : '새 식당 추가'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <IconX size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">식당 이름 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 파티박스"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">건물명</label>
                  <input
                    type="text"
                    value={formData.building_name}
                    onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
                    placeholder="예: 동서대"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">점심 기본 가격</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_lunch}
                    onChange={(e) => setFormData({ ...formData, price_lunch: e.target.value })}
                    placeholder="예: 7000"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">저녁 기본 가격</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_dinner}
                    onChange={(e) => setFormData({ ...formData, price_dinner: e.target.value })}
                    placeholder="예: 7000"
                    disabled={!formData.has_dinner}
                    className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${!formData.has_dinner ? 'bg-slate-100 text-slate-400' : ''}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.has_dinner ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
                    {formData.has_dinner && <IconCheck size={14} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.has_dinner}
                    onChange={(e) => setFormData({ ...formData, has_dinner: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-slate-700">저녁 식사 제공</span>
                </label>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-2">요일 입력 방식</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.use_all_days ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300 group-hover:border-purple-400'}`}>
                      {formData.use_all_days && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <input
                      type="radio"
                      name="use_all_days"
                      className="hidden"
                      checked={formData.use_all_days === true}
                      onChange={(e) => setFormData({ ...formData, use_all_days: true })}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">전체 요일 모드</span>
                      <p className="text-xs text-slate-500 mt-0.5">일주일치 식단표를 한 번에 입력합니다</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${!formData.use_all_days ? 'bg-orange-600 border-orange-600' : 'bg-white border-slate-300 group-hover:border-orange-400'}`}>
                      {!formData.use_all_days && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <input
                      type="radio"
                      name="use_all_days"
                      className="hidden"
                      checked={formData.use_all_days === false}
                      onChange={(e) => setFormData({ ...formData, use_all_days: false })}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">개별 요일 모드</span>
                      <p className="text-xs text-slate-500 mt-0.5">요일별로 개별 입력합니다</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  웹훅 URL
                  <span className="text-slate-400 font-normal ml-1">(선택)</span>
                </label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="예: http://localhost:5678/webhook/xxxxx"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  n8n 등의 웹훅 URL을 입력하면 자동으로 데이터를 가져올 수 있습니다.
                </p>
              </div>

              {/* 웹훅 URL 입력 시에만 타입 선택 표시 */}
              {formData.webhook_url && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-slate-500 mb-2">웹훅 데이터 타입</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.webhook_type === 'image' ? 'bg-cyan-600 border-cyan-600' : 'bg-white border-slate-300 group-hover:border-cyan-400'}`}>
                        {formData.webhook_type === 'image' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <input
                        type="radio"
                        name="webhook_type"
                        className="hidden"
                        checked={formData.webhook_type === 'image'}
                        onChange={() => setFormData({ ...formData, webhook_type: 'image' })}
                      />
                      <span className="text-sm font-medium text-slate-700">이미지</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.webhook_type === 'json' ? 'bg-amber-600 border-amber-600' : 'bg-white border-slate-300 group-hover:border-amber-400'}`}>
                        {formData.webhook_type === 'json' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <input
                        type="radio"
                        name="webhook_type"
                        className="hidden"
                        checked={formData.webhook_type === 'json'}
                        onChange={() => setFormData({ ...formData, webhook_type: 'json' })}
                      />
                      <span className="text-sm font-medium text-slate-700">JSON</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formData.webhook_type === 'image'
                      ? '웹훅에서 이미지를 가져와 GPT로 분석합니다.'
                      : formData.webhook_type === 'json'
                        ? '웹훅에서 JSON 데이터를 직접 가져옵니다.'
                        : '웹훅에서 가져올 데이터 타입을 선택해주세요.'}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-slate-600 font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                취소
              </button>
              <button
                onClick={handleSaveRestaurant}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-sm shadow-md hover:shadow-lg"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementTab;

