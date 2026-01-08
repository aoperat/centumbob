import { useState, useEffect } from 'react';
import { IconTrash, IconPlus, IconCheck, IconX, IconRefreshCw } from './Icons';

const API_BASE_URL = 'http://localhost:3000/api';

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
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    price_lunch: '',
    price_dinner: '',
    has_dinner: true
  });

  // 날짜 관련 상태
  const [newDateInput, setNewDateInput] = useState("");

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
  }, []);

  // 모달 열기 (추가/수정)
  const openModal = (restaurant = null) => {
    if (restaurant) {
      setEditingId(restaurant.id);
      setFormData({
        name: restaurant.name,
        price_lunch: restaurant.price_lunch || '',
        price_dinner: restaurant.price_dinner || '',
        has_dinner: restaurant.has_dinner === 1
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        price_lunch: '',
        price_dinner: '',
        has_dinner: true
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
    if (!confirm(`정말 '${name}' 식당을 삭제하시겠습니까?`)) return;

    try {
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

  // 날짜 범위 관리 (기존 로직 유지)
  const addDateRange = () => {
    if (!newDateInput.trim()) return;
    setDateRanges([...dateRanges, newDateInput.trim()]);
    setNewDateInput("");
  };

  const deleteDateRange = (idx) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      setDateRanges(dateRanges.filter((_, i) => i !== idx));
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
                  <th className="px-6 py-3 font-bold">식당 이름</th>
                  <th className="px-6 py-3 font-bold">점심 가격</th>
                  <th className="px-6 py-3 font-bold">저녁 가격</th>
                  <th className="px-6 py-3 font-bold text-center">저녁 제공</th>
                  <th className="px-6 py-3 font-bold text-center">상태</th>
                  <th className="px-6 py-3 font-bold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <IconRefreshCw className="animate-spin" /> 로딩 중...
                      </div>
                    </td>
                  </tr>
                ) : dbRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">등록된 식당이 없습니다.</td>
                  </tr>
                ) : (
                  dbRestaurants.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{res.name}</td>
                      <td className="px-6 py-4 text-slate-600">{res.price_lunch || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{res.price_dinner || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${res.has_dinner ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                          {res.has_dinner ? '제공' : '미제공'}
                        </span>
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
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="새 날짜 범위 입력 (예: 1월 26일 ~ 1월 30일)"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDateRange()}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              />
              <button
                onClick={addDateRange}
                className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dateRanges.map((date, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all group">
                  <span className="text-slate-700 text-sm font-medium">{date}</span>
                  <button
                    onClick={() => deleteDateRange(idx)}
                    className="text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
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
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">식당 이름 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 센텀호텔 구내식당"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">점심 기본 가격</label>
                  <input
                    type="text"
                    value={formData.price_lunch}
                    onChange={(e) => setFormData({ ...formData, price_lunch: e.target.value })}
                    placeholder="예: 7,000원"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">저녁 기본 가격</label>
                  <input
                    type="text"
                    value={formData.price_dinner}
                    onChange={(e) => setFormData({ ...formData, price_dinner: e.target.value })}
                    placeholder="예: 7,000원"
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

