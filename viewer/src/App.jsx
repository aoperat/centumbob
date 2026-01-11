import { useState, useEffect } from "react";
import {
  IconUtensils,
  IconImage,
  IconX,
  IconCalendar,
} from "./components/Icons";
import MenuList from "./components/MenuList";
import ComplaintModal from "./components/ComplaintModal";
import { getPageViews, incrementPageView } from "./utils/api";

function App() {
  const [activeDay, setActiveDay] = useState("월");
  const [modalImage, setModalImage] = useState(null);
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState("");
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [pageViewCount, setPageViewCount] = useState(null);

  const days = ["월", "화", "수", "목", "금"];
  const cafeteriaKeys = Object.keys(menuData);

  // 식당 목록 및 날짜 범위 추출 (민원 모달용)
  const restaurants = cafeteriaKeys;
  const dateRanges = [];
  // menuData에서 날짜 범위 추출
  Object.values(menuData).forEach((data) => {
    if (data.data?.date && !dateRanges.includes(data.data.date)) {
      dateRanges.push(data.data.date);
    }
  });

  // JSON 데이터 로드
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setLoading(true);
        // Vite에서는 public 폴더의 파일을 절대 경로로 접근
        // import.meta.env.BASE_URL은 vite.config.js의 base 설정값
        const basePath = import.meta.env.BASE_URL;
        // 캐시 버스터: 매 요청마다 새로운 타임스탬프 사용
        const dataPath = `${basePath}data/menu-data.json`.replace(/\/\//g, "/");
        const urlWithCacheBuster = `${dataPath}?t=${Date.now()}`;
        const response = await fetch(urlWithCacheBuster, {
          cache: "no-store", // 추가적인 캐시 방지
        });

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
        console.error("데이터 로드 오류:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, []);

  // 방문자수 조회 및 증가
  useEffect(() => {
    const trackPageView = async () => {
      // 프로덕션: BASE_URL 사용, 개발: "/" 사용
      let pagePath = import.meta.env.PROD
        ? import.meta.env.BASE_URL || "/centumbob/"
        : "/centumbob/";

      // 날짜별 방문자수 집계를 위해 경로에 날짜 추가 (오늘 날짜 기준)
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // 경로가 /로 끝나면 그대로 날짜 추가, 아니면 / 추가 후 날짜
      // 예: /centumbob/ -> /centumbob/2026-01-09
      pagePath = pagePath.endsWith('/') ? `${pagePath}${dateString}` : `${pagePath}/${dateString}`;
      
      console.log("방문자수 추적 경로 (일별):", pagePath); // 디버깅용

      // 중복 카운트 방지: sessionStorage 사용
      const viewKey = `page_view_${pagePath}`;
      const hasViewed = sessionStorage.getItem(viewKey);

      // 1. 방문자수 증가 (실패해도 조회는 시도)
      if (!hasViewed) {
        try {
          await incrementPageView(pagePath);
          sessionStorage.setItem(viewKey, "true");
        } catch (err) {
          console.warn("방문자수 증가 실패 (계속 진행):", err);
          // 증가 실패는 무시하고 조회 진행
        }
      }

      // 2. 방문자수 조회
      try {
        const result = await getPageViews(pagePath);
        console.log("방문자수 API 응답:", result); // 디버깅용

        if (result?.success && result?.data) {
          // Edge Function 응답 구조: { success: true, data: { view_count: number, ... } }
          const viewCount = result.data.view_count ?? 0;
          console.log("설정할 방문자수:", viewCount); // 디버깅용
          setPageViewCount(viewCount);
        } else if (result?.data?.view_count !== undefined) {
          // 다른 응답 구조 대비
          setPageViewCount(result.data.view_count);
        } else {
          // 응답 구조가 예상과 다를 경우
          console.warn("예상하지 못한 응답 구조:", result);
          setPageViewCount(0); // 기본값 설정
        }
      } catch (error) {
        console.error("방문자수 조회 실패:", error);
        // 에러 발생 시에도 0으로 설정하여 "로딩 중..." 대신 표시
        setPageViewCount(0);
      }
    };

    trackPageView();
  }, []);

  // 오늘 요일 계산
  const getTodayDay = () => {
    const dayIndex = new Date().getDay();
    const dayMap = ["일", "월", "화", "수", "목", "금", "토"];
    return dayMap[dayIndex];
  };

  const todayDay = getTodayDay();
  const isWeekend = todayDay === "일" || todayDay === "토";

  // URL 쿼리 파라미터로 요일 선택 (블로그 생성용)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dayParam = urlParams.get('day');
    
    if (dayParam && ['월', '화', '수', '목', '금'].includes(dayParam)) {
      // URL 파라미터가 있으면 해당 요일로 설정
      setActiveDay(dayParam);
    } else {
      // URL 파라미터가 없으면 오늘 요일 자동 선택 (주말은 월요일)
      const currentDay = isWeekend ? "월" : todayDay;
      setActiveDay(currentDay);
    }
  }, [todayDay, isWeekend]);

  // 메뉴 데이터 추출 헬퍼 함수
  const getMenuData = (cafeteriaName, day, type) => {
    const data = menuData[cafeteriaName];
    if (!data) return { menu: null, price: "" };

    const menus = data.data?.menus;
    if (!menus) return { menu: null, price: "" };

    const dayMenu = menus[day];

    // 가격 정보 가져오기
    const priceKey = type === "점심" ? "lunch" : "dinner";
    const price = data.price?.[priceKey] || "";

    if (!dayMenu) return { menu: null, price };

    // 데이터가 배열인 경우 (단일 메뉴) -> 점심에만 표시
    if (Array.isArray(dayMenu)) {
      if (type === "점심") return { menu: dayMenu, price };
      return { menu: null, price };
    }

    // 데이터가 객체인 경우 (점심/저녁 분리)
    if (typeof dayMenu === "object") {
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
            <div className="flex items-center gap-3">
              {currentDate && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <IconCalendar /> {currentDate}
                </span>
              )}
              <button
                onClick={() => setIsComplaintModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                민원 제출
              </button>
            </div>
          </div>

          {/* 요일 선택 탭 */}
          <div className="flex justify-between bg-slate-100 p-1 rounded-xl max-w-md mx-auto sm:mx-0">
            {days.map((day) => {
              const isActive = activeDay === day;
              const isToday = !isWeekend && day === todayDay;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`
                    relative flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200
                    ${
                      isActive
                        ? isToday
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50 scale-105"
                          : "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                        : isToday
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-200"
                        : "text-slate-400 hover:text-slate-600"
                    }
                  `}
                >
                  <span className="relative z-10">{day}</span>
                  {isActive && isToday && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-blue-600/20 animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 (테이블 구조) */}
      <main className="w-full max-w-7xl px-4 mt-6">
        <div className="mb-3 text-sm font-medium text-slate-500 ml-1">
          <span className="text-blue-600 font-bold">{activeDay}요일</span>의
          식단 비교
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
                    // 요일별 이미지가 있으면 해당 요일 이미지 사용, 없으면 전체 이미지 사용
                    const imageUrlsByDay = menuData[name]?.imageUrlsByDay;
                    const dayImageUrl = imageUrlsByDay?.[activeDay];
                    const hasImageByDay = !!dayImageUrl;
                    const hasImage =
                      hasImageByDay ||
                      (menuData[name]?.imageUrls &&
                       menuData[name].imageUrls.length > 0);

                    // 해당 요일에 메뉴 데이터가 있는지 확인
                    const { menu: lunchMenu } = getMenuData(name, activeDay, "점심");
                    const { menu: dinnerMenu } = getMenuData(name, activeDay, "저녁");
                    const hasDayData = (lunchMenu && lunchMenu.length > 0) || (dinnerMenu && dinnerMenu.length > 0);

                    const getImageUrl = (imageUrl) => {
                      // base64 이미지는 그대로 사용
                      if (imageUrl.startsWith("data:")) {
                        return imageUrl;
                      }
                      // 상대 경로인 경우 base 경로 추가
                      const basePath = import.meta.env.BASE_URL;
                      return `${basePath}${imageUrl}`.replace(/\/\//g, "/");
                    };

                    // 표시할 이미지 URL 결정: 요일별 이미지 우선, 없으면 전체 이미지
                    const displayImageUrl = dayImageUrl 
                      ? getImageUrl(dayImageUrl)
                      : (menuData[name]?.imageUrls?.[0] ? getImageUrl(menuData[name].imageUrls[0]) : null);

                    return (
                      <th
                        key={idx}
                        className="p-4 bg-slate-50 border-b border-slate-200 text-left min-w-[200px]"
                      >
                        <div className="flex flex-col gap-1">
                          <span
                            className="text-slate-800 font-bold text-sm block truncate w-full"
                            title={name}
                          >
                            {name.split("(")[0].trim()}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-normal truncate">
                              {name.includes("(")
                                ? name.match(/\((.*?)\)/)?.[1] || ""
                                : ""}
                            </span>
                            {hasImage && hasDayData && displayImageUrl && (
                              <button
                                onClick={() =>
                                  setModalImage(displayImageUrl)
                                }
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
                      <span className="text-xs font-bold text-slate-600">
                        점심
                      </span>
                    </div>
                  </th>
                  {cafeteriaKeys.map((name, idx) => {
                    const { menu, price } = getMenuData(
                      name,
                      activeDay,
                      "점심"
                    );
                    return (
                      <td
                        key={idx}
                        className="p-4 align-top bg-white hover:bg-slate-50 transition-colors"
                      >
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
                      <span className="text-xs font-bold text-slate-600">
                        저녁
                      </span>
                    </div>
                  </th>
                  {cafeteriaKeys.map((name, idx) => {
                    const { menu, price } = getMenuData(
                      name,
                      activeDay,
                      "저녁"
                    );
                    return (
                      <td
                        key={idx}
                        className="p-4 align-top bg-slate-50/50 hover:bg-slate-100 transition-colors"
                      >
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

        {/* 방문자수 표시 */}
        <div className="w-full max-w-7xl px-4 mt-4 mb-2">
          <div className="text-center text-sm text-slate-600">
            {pageViewCount !== null && pageViewCount !== undefined ? (
              <span>
                오늘{" "}
                <span className="font-bold text-blue-600">
                  {pageViewCount.toLocaleString()}
                </span>
                명이 방문했어요
              </span>
            ) : (
              <span className="text-slate-400">로딩 중...</span>
            )}
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="text-center text-xs text-slate-400 py-6">
          * 점심/저녁 데이터가 없는 경우 공란으로 표시됩니다.
          <br />* 좌우로 스크롤하여 더 많은 식당을 확인하세요.
        </div>

        {/* 외부 링크 */}
        <div className="flex flex-wrap gap-2 justify-center mb-6 text-xs">
          <a
            href="https://pf.kakao.com/_FxbaQC"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FEE500] text-[#3C1E1E] rounded-lg hover:bg-[#FDD835] transition-colors font-medium shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.48 2 11c0 2.84 1.75 5.36 4.39 6.72L5.5 21l3.5-1.28c1.08.3 2.22.47 3.4.47 5.52 0 10-3.48 10-8s-4.48-8-10-8z" />
            </svg>
            삼촌밥차런치펍
          </a>
          <a
            href="https://pf.kakao.com/_CiVis"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FEE500] text-[#3C1E1E] rounded-lg hover:bg-[#FDD835] transition-colors font-medium shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.48 2 11c0 2.84 1.75 5.36 4.39 6.72L5.5 21l3.5-1.28c1.08.3 2.22.47 3.4.47 5.52 0 10-3.48 10-8s-4.48-8-10-8z" />
            </svg>
            슈마우스만찬센텀점
          </a>
          <a
            href="https://blog.naver.com/dawafood-qubi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#03C75A] text-white rounded-lg hover:bg-[#02b350] transition-colors font-medium shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
            </svg>
            큐비e센텀
          </a>
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
            onClick={(e) => e.stopPropagation()}
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
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 민원 제출 모달 */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        restaurants={restaurants}
        dateRanges={dateRanges}
      />
    </div>
  );
}

export default App;
