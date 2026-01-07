import { useState, useEffect, useRef } from 'react';
import { IconFileText, IconSave, IconSettings } from './components/Icons';
import EntryTab from './components/EntryTab';
import ManagementTab from './components/ManagementTab';
import ComplaintTab from './components/ComplaintTab';
import ComplaintAdminTab from './components/ComplaintAdminTab';
import { saveMenuData, publishMenuData } from './utils/api';

function App() {
  const entryTabRef = useRef(null);
  // --- Global State ---
  const [currentTab, setCurrentTab] = useState("entry"); // 'entry' | 'management' | 'complaint' | 'complaint-admin'

  // --- Management State ---
  const [restaurants, setRestaurants] = useState([
    "벽산E센텀 (만나)", 
    "동서대 (파티박스)", 
    "에이스하이테크21 (다와푸드)", 
    "부산영상산업센터 (STX f&c)"
  ]);
  const [dateRanges, setDateRanges] = useState([
    "1월 5일 ~ 1월 9일", 
    "1월 12일 ~ 1월 16일", 
    "1월 19일 ~ 1월 23일"
  ]);

  // --- Entry State ---
  const [selectedCafeteria, setSelectedCafeteria] = useState(restaurants[0]);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRanges[1] || dateRanges[0]);

  // 식당 목록이 바뀌면 선택값 안전장치
  useEffect(() => {
    if (!restaurants.includes(selectedCafeteria)) {
      setSelectedCafeteria(restaurants[0] || "");
    }
  }, [restaurants, selectedCafeteria]);

  // 날짜 목록이 바뀌면 선택값 안전장치
  useEffect(() => {
    if (!dateRanges.includes(selectedDateRange)) {
      setSelectedDateRange(dateRanges[0] || "");
    }
  }, [dateRanges, selectedDateRange]);

  const handleSave = async (finalData, imageFile) => {
    try {
      const result = await saveMenuData(finalData, imageFile);
      alert(`${finalData.name} (${finalData.date}) 데이터 저장 완료!`);
      console.log("저장된 데이터:", result);
    } catch (error) {
      alert(`데이터 저장 실패: ${error.message}`);
      console.error("저장 오류:", error);
    }
  };

  const handlePublish = async () => {
    try {
      const result = await publishMenuData();
      alert('데이터 게시 완료! 뷰어 페이지에서 확인할 수 있습니다.');
      console.log("게시된 데이터:", result);
    } catch (error) {
      alert(`데이터 게시 실패: ${error.message}`);
      console.error("게시 오류:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 상단 네비게이션 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-slate-800 text-white p-2 rounded-lg">
                <IconFileText size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-800">식단 데이터 관리자</h1>
            </div>
            {/* 탭 메뉴 */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setCurrentTab("entry")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  currentTab === 'entry' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                데이터 입력
              </button>
              <button
                onClick={() => setCurrentTab("management")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${
                  currentTab === 'management' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <IconSettings size={14} /> 기준 데이터 관리
              </button>
              <button
                onClick={() => setCurrentTab("complaint")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  currentTab === 'complaint' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                민원 제출
              </button>
              <button
                onClick={() => setCurrentTab("complaint-admin")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  currentTab === 'complaint-admin' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                민원 관리
              </button>
            </div>
          </div>

          {/* 액션 버튼 (입력 탭에서만 표시) */}
          {currentTab === 'entry' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (entryTabRef.current) {
                    entryTabRef.current.save();
                  }
                }}
                className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <IconSave size={18} />
                데이터 저장
              </button>
              <button
                onClick={handlePublish}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <IconSave size={18} />
                데이터 게시
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex overflow-hidden">
        {/* ================= 탭 1: 데이터 입력 ================= */}
        {currentTab === 'entry' && (
          <EntryTab
            ref={entryTabRef}
            restaurants={restaurants}
            dateRanges={dateRanges}
            selectedCafeteria={selectedCafeteria}
            setSelectedCafeteria={setSelectedCafeteria}
            selectedDateRange={selectedDateRange}
            setSelectedDateRange={setSelectedDateRange}
            onSave={handleSave}
          />
        )}

        {/* ================= 탭 2: 기준 데이터 관리 ================= */}
        {currentTab === 'management' && (
          <ManagementTab
            restaurants={restaurants}
            setRestaurants={setRestaurants}
            dateRanges={dateRanges}
            setDateRanges={setDateRanges}
          />
        )}

        {/* ================= 탭 3: 민원 제출 ================= */}
        {currentTab === 'complaint' && (
          <ComplaintTab
            restaurants={restaurants}
            dateRanges={dateRanges}
          />
        )}

        {/* ================= 탭 4: 민원 관리 ================= */}
        {currentTab === 'complaint-admin' && (
          <ComplaintAdminTab
            restaurants={restaurants}
          />
        )}
      </main>
    </div>
  );
}

export default App;

