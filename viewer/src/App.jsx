import { useState, useEffect } from 'react';
import { IconUtensils, IconImage, IconX, IconCalendar } from './components/Icons';
import MenuList from './components/MenuList';

function App() {
  const [activeDay, setActiveDay] = useState("월");
  const [modalImage, setModalImage] = useState(null);
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState("");

  const days = ["월", "화", "수", "목", "금"];
  const cafeteriaKeys = Object.keys(menuData);

  // JSON 데이터 로드
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setLoading(true);
        // Vite에서는 public 폴더의 파일을 절대 경로로 접근
        // import.meta.env.BASE_URL은 vite.config.js의 base 설정값
        const basePath = import.meta.env.BASE_URL;
        const dataPath = `${basePath}data/menu-data.json`.replace(/\/\//g, '/');
        const response = await fetch(dataPath);
        
        if (!response.ok) {
          throw new Error(`데이터를 불러올 수 없습니다. (${response.status})`);
        }
        
        const data = await response.json();
        setMenuData(data);
        
        // 첫 번째 식당의 날짜 정보 가져오기
        const firstCafeteria = Object.values(data)[0];
        if (firstCafeteria && firstCafeteria.data) {
          setCurrentDate(firstCafeteria.data.date || "");
        }
      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, []);

  // 오늘 요일 자동 선택 (주말은 월요일)
  useEffect(() => {
    const dayIndex = new Date().getDay();
    const dayMap = ["일", "월", "화", "수", "목", "금", "토"];
    let currentDay = dayMap[dayIndex];
    if (currentDay === "일" || currentDay === "토") currentDay = "월";
    setActiveDay(currentDay);
  }, []);

  // 메뉴 데이터 추출 헬퍼 함수
  const getMenuData = (cafeteriaName, day, type) => {
    const data = menuData[cafeteriaName];
    if (!data) return { menu: null, price: "" };
    
    const menus = data.data?.menus;
    if (!menus) return { menu: null, price: "" };
    
    const dayMenu = menus[day];

    // 가격 정보 가져오기
    const priceKey = type === '점심' ? 'lunch' : 'dinner';
    const price = data.price?.[priceKey] || "";

    if (!dayMenu) return { menu: null, price };

    // 데이터가 배열인 경우 (단일 메뉴) -> 점심에만 표시
    if (Array.isArray(dayMenu)) {
      if (type === '점심') return { menu: dayMenu, price };
      return { menu: null, price };
    }

    // 데이터가 객체인 경우 (점심/저녁 분리)
    if (typeof dayMenu === 'object') {
      return { menu: dayMenu[type], price };
    }
    return { menu: null, price };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">오류: {error}</p>
          <p className="text-slate-500 text-sm">데이터 파일을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  if (cafeteriaKeys.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">표시할 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-10">
      {/* 상단 헤더 & 요일 탭 */}
      <header className="bg-white w-full sticky top-0 z-20 shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1.5 rounded-lg">
                <IconUtensils className="w-5 h-5" />
              </span>
              센텀 밥집
            </h1>
            {currentDate && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                <IconCalendar /> {currentDate}
              </span>
            )}
          </div>

          {/* 요일 선택 탭 */}
          <div className="flex justify-between bg-slate-100 p-1 rounded-xl max-w-md mx-auto sm:mx-0">
            {days.map((day) => {
              const isActive = activeDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`
                    flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200
                    ${isActive
                      ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                      : "text-slate-400 hover:text-slate-600"}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 (테이블 구조) */}
      <main className="w-full max-w-7xl px-4 mt-6">
        <div className="mb-3 text-sm font-medium text-slate-500 ml-1">
          <span className="text-blue-600 font-bold">{activeDay}요일</span>의 식단 비교
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* 모바일 대응: 가로 스크롤 허용 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  {/* 왼쪽 상단 빈 셀 (헤더 교차점) */}
                  <th className="p-4 bg-slate-50 border-b border-r border-slate-200 w-24 sticky left-0 z-10 text-slate-400 font-medium text-xs uppercase tracking-wider">
                    구분
                  </th>
                  {/* 상단 헤더: 회사명 */}
                  {cafeteriaKeys.map((name, idx) => {
                    const hasImage = menuData[name]?.imageUrls && menuData[name].imageUrls.length > 0;
                    const getImageUrl = (imageUrl) => {
                      // base64 이미지는 그대로 사용
                      if (imageUrl.startsWith('data:')) {
                        return imageUrl;
                      }
                      // 상대 경로인 경우 base 경로 추가
                      const basePath = import.meta.env.BASE_URL;
                      return `${basePath}${imageUrl}`.replace(/\/\//g, '/');
                    };
                    
                    return (
                      <th key={idx} className="p-4 bg-slate-50 border-b border-slate-200 text-left min-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-800 font-bold text-sm block truncate w-full" title={name}>
                            {name.split('(')[0].trim()}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-normal truncate">
                              {name.includes('(') ? name.match(/\((.*?)\)/)?.[1] || '' : ''}
                            </span>
                            {hasImage && (
                              <button
                                onClick={() => setModalImage(getImageUrl(menuData[name].imageUrls[0]))}
                                className="ml-auto p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="원본 이미지 보기"
                              >
                                <IconImage />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 점심 행 */}
                <tr>
                  <th className="p-4 bg-white border-r border-slate-200 sticky left-0 z-10">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                        <IconUtensils className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-bold text-slate-600">점심</span>
                    </div>
                  </th>
                  {cafeteriaKeys.map((name, idx) => {
                    const { menu, price } = getMenuData(name, activeDay, '점심');
                    return (
                      <td key={idx} className="p-4 align-top bg-white hover:bg-slate-50 transition-colors">
                        {menu && menu.length > 0 && (
                          <div className="inline-block px-2 py-0.5 bg-orange-50 border border-orange-100 rounded text-orange-700 text-xs font-bold mb-1">
                            {price}
                          </div>
                        )}
                        <MenuList items={menu} />
                      </td>
                    );
                  })}
                </tr>
                {/* 저녁 행 */}
                <tr>
                  <th className="p-4 bg-slate-50/50 border-r border-slate-200 sticky left-0 z-10">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <span className="text-xs font-bold">🌙</span>
                      </span>
                      <span className="text-xs font-bold text-slate-600">저녁</span>
                    </div>
                  </th>
                  {cafeteriaKeys.map((name, idx) => {
                    const { menu, price } = getMenuData(name, activeDay, '저녁');
                    return (
                      <td key={idx} className="p-4 align-top bg-slate-50/50 hover:bg-slate-100 transition-colors">
                        {menu && menu.length > 0 && (
                          <div className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 text-xs font-bold mb-1">
                            {price}
                          </div>
                        )}
                        <MenuList items={menu} />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="text-center text-xs text-slate-400 py-6">
          * 점심/저녁 데이터가 없는 경우 공란으로 표시됩니다.<br />
          * 좌우로 스크롤하여 더 많은 식당을 확인하세요.
        </div>
      </main>

      {/* 이미지 모달 */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="bg-white rounded-xl overflow-hidden w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-slate-800">식단표 원본</h3>
              <button 
                onClick={() => setModalImage(null)} 
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                <IconX />
              </button>
            </div>
            <div className="overflow-auto p-0 bg-slate-900 flex-1 flex items-center justify-center min-h-[300px]">
              <img
                src={modalImage}
                alt="Original Menu"
                className="max-w-full h-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

