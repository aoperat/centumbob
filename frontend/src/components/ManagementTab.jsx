import { useState } from 'react';
import { IconTrash } from './Icons';

const ManagementTab = ({ 
  restaurants, 
  setRestaurants, 
  dateRanges, 
  setDateRanges 
}) => {
  const [newResInput, setNewResInput] = useState("");
  const [newDateInput, setNewDateInput] = useState("");

  const addRestaurant = () => {
    if (!newResInput.trim()) return;
    setRestaurants([...restaurants, newResInput.trim()]);
    setNewResInput("");
  };

  const deleteRestaurant = (idx) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      setRestaurants(restaurants.filter((_, i) => i !== idx));
    }
  };

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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 식당 관리 섹션 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">식당 목록 관리</h3>
              <p className="text-xs text-slate-500">데이터 입력 시 선택할 식당 목록을 관리합니다.</p>
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{restaurants.length}개</span>
          </div>
          <div className="p-6">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="새 식당 이름 입력 (예: 센텀호텔 구내식당)"
                value={newResInput}
                onChange={(e) => setNewResInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRestaurant()}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <button
                onClick={addRestaurant}
                className="bg-slate-800 text-white px-5 py-2 rounded-lg font-bold hover:bg-slate-900 transition-colors"
              >
                추가
              </button>
            </div>
            <div className="space-y-2">
              {restaurants.map((res, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-200 hover:bg-white transition-all group">
                  <span className="text-slate-700 font-medium">{res}</span>
                  <button
                    onClick={() => deleteRestaurant(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 날짜 관리 섹션 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">날짜 범위 관리</h3>
              <p className="text-xs text-slate-500">주간 식단표의 날짜 범위를 미리 등록해두세요.</p>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">{dateRanges.length}개</span>
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
            <div className="space-y-2">
              {dateRanges.map((date, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-green-200 hover:bg-white transition-all group">
                  <span className="text-slate-700 font-medium">{date}</span>
                  <button
                    onClick={() => deleteDateRange(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementTab;

