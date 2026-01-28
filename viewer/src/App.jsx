import { useState, useEffect, useRef } from "react";
import {
  IconImage,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from "./components/Icons";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import MenuList from "./components/MenuList";
import { getAllRestaurantsPopularMenus } from "./utils/menuLikesApi";
import ComplaintModal from "./components/ComplaintModal";
import AdInquiryModal from "./components/AdInquiryModal";
import AuthModal from "./components/AuthModal";
import ProfileModal from "./components/ProfileModal";
import ChatWindowV2 from "./components/ChatWindowV2";
import CommunityModal from "./components/community/CommunityModal";
import { getPageViews, incrementPageView } from "./utils/api";
import { getActiveMenuData, subscribeToMenuChanges } from "./utils/menuApi";
import { getUserLocation, addDistanceToMenuData, getNaverMapUrl, getDirectionsUrl } from "./utils/location";
import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChatV2";
import "./styles/animations.css";

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  // 채팅 데이터 가져오기 (전광판과 채팅창이 공유)
  const {
    messages,
    loading: chatLoading,
    error: chatError,
    sending,
    sendMessage,
    chatDate,
    isInputEnabled,
    displayName,
    isAnonymous,
    anonymousMessagesRemaining,
  } = useChat();

  const [activeDay, setActiveDay] = useState("월");
  const [modalImage, setModalImage] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState("");
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isAdInquiryModalOpen, setIsAdInquiryModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [pageViewCount, setPageViewCount] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [popularMenusMap, setPopularMenusMap] = useState({}); // 식당별 역대 인기 메뉴
  const [userLocation, setUserLocation] = useState(null); // 사용자 위치
  const [locationError, setLocationError] = useState(null); // 위치 오류
  const [locationLoaded, setLocationLoaded] = useState(false); // 위치 로딩 완료 여부
  // 점심/저녁 토글: 14시 이전은 점심, 이후는 저녁 기본 선택
  const [mealType, setMealType] = useState(() => {
    const hour = new Date().getHours();
    return hour < 14 ? "점심" : "저녁";
  });
  // 모바일: 데이터 있는 식당만 표시 토글
  const [showOnlyWithData, setShowOnlyWithData] = useState(false);
  // 데이터 업데이트 알림
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  const tableScrollRef = useRef(null);

  // 최신 메시지 가져오기
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // 빠른 접근을 위한 name 기반 맵 생성
  const menuMap = Object.fromEntries(menuData.map(d => [d.name, d]));
  const cafeteriaKeys = menuData.map(d => d.name);

  // 식당 목록 및 날짜 범위 추출 (민원 모달용)
  const restaurants = cafeteriaKeys;
  const dateRanges = [];
  // menuData에서 날짜 범위 추출
  menuData.forEach((data) => {
    if (data.data?.date && !dateRanges.includes(data.data.date)) {
      dateRanges.push(data.data.date);
    }
  });

  // 사용자 위치 가져오기
  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        console.log('[위치] 사용자 위치:', location);
      } catch (error) {
        console.warn('[위치] 위치 정보 가져오기 실패:', error.message);
        setLocationError(error.message);
      } finally {
        setLocationLoaded(true); // 위치 로딩 완료 (성공/실패 상관없이)
      }
    };

    loadUserLocation();
  }, []);

  // 메뉴 데이터 로드 함수 (재사용 가능하도록 별도 함수로 분리)
  const loadMenuData = async (showNotification = false) => {
    try {
      if (showNotification) {
        setLoading(false); // 백그라운드 업데이트는 로딩 표시 안함
      } else {
        setLoading(true);
      }

      // Supabase에서 직접 메뉴 데이터 조회
      let data = await getActiveMenuData();

      // 배열로 받아야 하며, 만약 객체라면 에러 처리
      if (!Array.isArray(data)) {
        throw new Error("데이터 형식이 올바르지 않습니다. 배열이어야 합니다.");
      }

      // 사용자 위치가 있으면 거리 정보 추가 및 거리순 정렬
      if (userLocation) {
        data = addDistanceToMenuData(data, userLocation);
        // 거리순으로 정렬 (가까운 순서)
        data.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      setMenuData(data);

      // 첫 번째 식당의 날짜 정보 가져오기
      const firstCafeteria = data[0];
      if (firstCafeteria && firstCafeteria.data) {
        setCurrentDate(firstCafeteria.data.date || "");
      }

      // 업데이트 알림 숨기기
      if (showNotification) {
        setShowUpdateNotification(false);
      }
    } catch (err) {
      console.error("데이터 로드 오류:", err);
      setError(err.message || "메뉴 데이터를 불러오는데 실패했습니다.");
    } finally {
      if (!showNotification) {
        setLoading(false);
      }
    }
  };

  // JSON 데이터 로드 (위치 로딩 완료 후 한 번만 실행)
  useEffect(() => {
    if (!locationLoaded) return; // 위치 로딩이 완료될 때까지 대기
    loadMenuData();
  }, [locationLoaded]); // 위치 로딩 완료 시 한 번만 실행

  // Realtime 구독: 메뉴 데이터 변경 감지
  useEffect(() => {
    if (!locationLoaded) return; // 위치 로딩이 완료될 때까지 대기

    console.log('[App] Realtime 구독 설정 시작');

    const subscription = subscribeToMenuChanges((change) => {
      console.log('[App] 데이터 변경 감지:', change);
      // 변경사항이 있으면 알림 표시
      setShowUpdateNotification(true);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[App] Realtime 구독 해제');
      subscription.unsubscribe();
    };
  }, [locationLoaded]);

  // 식당별 역대 인기 메뉴 로드
  useEffect(() => {
    const loadPopularMenus = async () => {
      try {
        const data = await getAllRestaurantsPopularMenus(2); // 최소 2개 좋아요
        setPopularMenusMap(data);
      } catch (error) {
        console.error('인기 메뉴 로드 실패:', error);
      }
    };

    loadPopularMenus();
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
    const data = menuMap[cafeteriaName];
    if (!data) return { menu: null, price: "" };

    // 가격 정보는 메뉴와 상관없이 먼저 가져오기
    const priceKey = type === "점심" ? "lunch" : "dinner";
    const price = data.price?.[priceKey] || "";

    const menus = data.data?.menus;
    if (!menus) return { menu: null, price };

    const dayMenu = menus[day];
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

  // 스크롤 상태 체크
  const checkScrollButtons = () => {
    const container = tableScrollRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // 스크롤 함수
  const scrollTable = (direction) => {
    const container = tableScrollRef.current;
    if (!container) return;

    const scrollAmount = 300; // 스크롤할 픽셀 수
    const newScrollLeft = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const container = tableScrollRef.current;
    if (!container) return;

    checkScrollButtons();
    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [menuData]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 네비게이션 바 */}
      <NavBar
        currentDate={currentDate}
        isAuthenticated={isAuthenticated}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenCommunity={() => setIsCommunityModalOpen(true)}
        onLogout={logout}
        activeDay={activeDay}
        onDayChange={setActiveDay}
        todayDay={todayDay}
        isWeekend={isWeekend}
      />

      {/* 채팅 전광판 */}
      <div
        onClick={() => setIsChatWindowOpen(true)}
        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-y border-blue-100 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm group"
      >
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          {/* 채팅 아이콘 + 라벨 */}
          <div className="flex-shrink-0 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-200 group-hover:border-blue-300 transition-colors">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-bold text-blue-600">실시간 채팅</span>
          </div>

          {/* 전광판 메시지 */}
          <div className="flex-1 overflow-hidden">
            {latestMessage ? (
              <div className="text-sm font-medium text-slate-700 truncate">
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                    {latestMessage.display_name}
                  </span>
                  <span>{latestMessage.content}</span>
                </span>
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic truncate">
                아직 채팅이 없습니다. 첫 메시지를 남겨보세요!
              </div>
            )}
          </div>

          {/* 클릭 안내 */}
          <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
            <span className="text-xs font-medium text-blue-600">채팅 참여하기</span>
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 (테이블 구조) */}
      <main className="w-full max-w-[1800px] mx-auto px-3 sm:px-4 mt-4 sm:mt-6 flex-1 pb-8">
        {/* 모바일: 식단 비교 헤더 + 점심/저녁 토글 */}
        <div className="md:hidden mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-500">
              <span className="text-blue-600 font-bold">{activeDay}요일</span>{" "}
              <span className={mealType === "점심" ? "text-orange-600 font-bold" : "text-indigo-600 font-bold"}>{mealType}</span>{" "}
              식단 비교
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setMealType("점심")}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1 ${
                  mealType === "점심"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-transparent text-slate-500"
                }`}
              >
                <span>☀️</span>
                점심
              </button>
              <button
                onClick={() => setMealType("저녁")}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1 ${
                  mealType === "저녁"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-transparent text-slate-500"
                }`}
              >
                <span>🌙</span>
                저녁
              </button>
            </div>
          </div>

          {/* 데이터 필터 토글 */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowOnlyWithData(!showOnlyWithData)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showOnlyWithData
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>{showOnlyWithData ? "전체 보기" : "메뉴 있는 곳만"}</span>
            </button>
          </div>
        </div>

        {/* 데스크탑: 식단 비교 헤더 */}
        <div className="hidden md:block mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-slate-500 ml-1">
          <span className="text-blue-600 font-bold">{activeDay}요일</span>{" "}
          <span className={mealType === "점심" ? "text-orange-600 font-bold" : "text-indigo-600 font-bold"}>{mealType}</span>{" "}
          식단 비교
        </div>

        {/* 모바일: 카드 레이아웃 */}
        <div className="md:hidden space-y-3">
          {(() => {
            const filteredKeys = cafeteriaKeys.filter((name) => {
              // "메뉴 있는 곳만" 필터가 켜져 있으면 현재 선택된 식사시간의 메뉴가 있는 곳만 표시
              if (!showOnlyWithData) return true;

              const currentMenu = mealType === "점심"
                ? getMenuData(name, activeDay, "점심").menu
                : getMenuData(name, activeDay, "저녁").menu;

              return currentMenu && currentMenu.length > 0;
            });

            // 필터링 결과가 비어있을 때
            if (filteredKeys.length === 0) {
              return (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-600 font-medium mb-1">
                    {activeDay}요일 {mealType} 메뉴가 없습니다
                  </p>
                  <p className="text-slate-400 text-sm">
                    다른 요일이나 식사시간을 선택하거나<br/>
                    "전체 보기"를 눌러주세요
                  </p>
                </div>
              );
            }

            return filteredKeys.map((name, idx) => {
            const imageUrlsByDay = menuMap[name]?.imageUrlsByDay;
            const dayImageUrl = imageUrlsByDay?.[activeDay];
            const hasImageByDay = !!dayImageUrl;
            const hasImage =
              hasImageByDay ||
              (menuMap[name]?.imageUrls &&
               menuMap[name].imageUrls.length > 0);

            const { menu: lunchMenu, price: lunchPrice } = getMenuData(name, activeDay, "점심");
            const { menu: dinnerMenu, price: dinnerPrice } = getMenuData(name, activeDay, "저녁");
            const hasDayData = (lunchMenu && lunchMenu.length > 0) || (dinnerMenu && dinnerMenu.length > 0);

            const getImageUrl = (imageUrl) => {
              // menuApi.js에서 이미 전체 경로를 구성하므로 그대로 반환
              return imageUrl;
            };

            const displayImageUrl = dayImageUrl
              ? getImageUrl(dayImageUrl)
              : (menuMap[name]?.imageUrls?.[0] ? getImageUrl(menuMap[name].imageUrls[0]) : null);

            const currentMenu = mealType === "점심" ? lunchMenu : dinnerMenu;
            const currentPrice = mealType === "점심" ? lunchPrice : dinnerPrice;

            // 메뉴 데이터가 없어도 식당은 표시
            return (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* 카드 헤더 */}
                <div className="bg-slate-50 p-3 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-slate-800">{name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {menuMap[name]?.building_name || '\u00A0'}
                      </p>
                    </div>
                    {menuMap[name]?.distanceText && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap ml-2">
                        {menuMap[name].distanceText}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {hasImage && displayImageUrl && (
                      <button
                        onClick={() => setModalImage(displayImageUrl)}
                        className="flex-1 min-w-[80px] px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border border-slate-200 rounded-lg transition-all flex items-center justify-center gap-1.5 group shadow-sm hover:shadow"
                        title="원본 이미지 보기"
                      >
                        <IconImage className="w-4 h-4 text-slate-600 group-hover:text-slate-700" />
                      </button>
                    )}
                    {/* TODO: 지도/길찾기 기능 완료 후 표시 */}
                    {false && (menuMap[name]?.location?.map_url || menuMap[name]?.location?.latitude) && (
                      <>
                        <button
                          onClick={() => window.open(
                            menuMap[name].location.map_url || getNaverMapUrl(
                              menuMap[name].location.latitude,
                              menuMap[name].location.longitude,
                              menuMap[name].building_name,
                              menuMap[name].location.address
                            ), '_blank')}
                          className="flex-1 min-w-[70px] px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-lg transition-all flex items-center justify-center gap-1.5 group shadow-sm hover:shadow"
                          title="네이버 지도에서 보기"
                        >
                          <svg className="w-4 h-4 text-green-600 group-hover:text-green-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => window.open(
                            menuMap[name].location.directions_url || getDirectionsUrl(
                              menuMap[name].location.latitude,
                              menuMap[name].location.longitude,
                              menuMap[name].building_name,
                              menuMap[name].location.address
                            ), '_blank')}
                          className="flex-1 min-w-[80px] px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg transition-all flex items-center justify-center gap-1.5 group shadow-sm hover:shadow"
                          title="길찾기"
                        >
                          <svg className="w-4 h-4 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 메뉴 내용 */}
                <div className="p-4">
                  {/* 가격 정보는 메뉴와 상관없이 표시 */}
                  {currentPrice && (
                    <div className={`inline-block px-2 py-1 border rounded text-xs font-bold mb-2 ${
                      mealType === "점심"
                        ? "bg-orange-50 border-orange-100 text-orange-700"
                        : "bg-indigo-50 border-indigo-100 text-indigo-700"
                    }`}>
                      {currentPrice}
                    </div>
                  )}
                  {currentMenu && currentMenu.length > 0 ? (
                    <>
                      <MenuList
                        items={currentMenu}
                        restaurantId={menuMap[name]?.id}
                        restaurantName={name}
                        day={activeDay}
                        mealType={mealType}
                        dateRange={currentDate}
                        popularMenus={popularMenusMap[menuMap[name]?.id] || {}}
                      />
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs italic">정보 없음</p>
                  )}
                </div>
              </div>
            );
          });
        })()}
        </div>

        {/* 데스크탑: 테이블 레이아웃 */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          {/* 왼쪽 스크롤 버튼 */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTable('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white border-2 border-slate-300 rounded-full p-2 shadow-lg transition-all hover:scale-110"
              aria-label="왼쪽으로 스크롤"
            >
              <IconChevronLeft className="w-6 h-6 text-slate-700" />
            </button>
          )}

          {/* 오른쪽 스크롤 버튼 */}
          {canScrollRight && (
            <button
              onClick={() => scrollTable('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/95 hover:bg-white border-2 border-slate-300 rounded-full p-2 shadow-lg transition-all hover:scale-110"
              aria-label="오른쪽으로 스크롤"
            >
              <IconChevronRight className="w-6 h-6 text-slate-700" />
            </button>
          )}

          {/* 가로 스크롤 허용 */}
          <div ref={tableScrollRef} className="overflow-x-auto scroll-smooth">
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
                    const imageUrlsByDay = menuMap[name]?.imageUrlsByDay;
                    const dayImageUrl = imageUrlsByDay?.[activeDay];
                    const hasImageByDay = !!dayImageUrl;
                    const hasImage =
                      hasImageByDay ||
                      (menuMap[name]?.imageUrls &&
                       menuMap[name].imageUrls.length > 0);

                    // 해당 요일에 메뉴 데이터가 있는지 확인
                    const { menu: lunchMenu } = getMenuData(name, activeDay, "점심");
                    const { menu: dinnerMenu } = getMenuData(name, activeDay, "저녁");
                    const hasDayData = (lunchMenu && lunchMenu.length > 0) || (dinnerMenu && dinnerMenu.length > 0);

                    const getImageUrl = (imageUrl) => {
                      // menuApi.js에서 이미 전체 경로를 구성하므로 그대로 반환
                      return imageUrl;
                    };

                    // 표시할 이미지 URL 결정: 요일별 이미지 우선, 없으면 전체 이미지
                    const displayImageUrl = dayImageUrl
                      ? getImageUrl(dayImageUrl)
                      : (menuMap[name]?.imageUrls?.[0] ? getImageUrl(menuMap[name].imageUrls[0]) : null);

                    return (
                      <th
                        key={idx}
                        className="p-4 bg-slate-50 border-b border-slate-200 text-left min-w-[220px]"
                      >
                        <div className="flex flex-col gap-2 min-h-[88px]">
                          {/* 첫 번째 줄: 식당명 + 거리 */}
                          <div className="flex items-center justify-between gap-2 h-6">
                            <span
                              className="text-slate-800 font-bold text-base truncate flex-1"
                              title={name}
                            >
                              {name}
                            </span>
                            {menuMap[name]?.distanceText && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
                                {menuMap[name].distanceText}
                              </span>
                            )}
                          </div>
                          {/* 두 번째 줄: 건물명 */}
                          <span className="text-slate-500 font-medium text-sm block truncate w-full h-5">
                            {menuMap[name]?.building_name || '\u00A0'}
                          </span>
                          {/* 세 번째 줄: 이미지/지도 버튼 */}
                          <div className="h-7 flex items-center gap-1">
                            {hasImage && hasDayData && displayImageUrl && (
                              <button
                                onClick={() =>
                                  setModalImage(displayImageUrl)
                                }
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-all text-xs flex items-center gap-1 shadow-sm hover:shadow group"
                                title="원본 이미지 보기"
                              >
                                <IconImage className="w-4 h-4 text-slate-600 group-hover:text-slate-700" />
                              </button>
                            )}
                            {/* TODO: 지도/길찾기 기능 완료 후 표시 */}
                            {false && (menuMap[name]?.location?.map_url || menuMap[name]?.location?.latitude) && (
                              <>
                                <button
                                  onClick={() => window.open(
                                    menuMap[name].location.map_url || getNaverMapUrl(
                                      menuMap[name].location.latitude,
                                      menuMap[name].location.longitude,
                                      menuMap[name].building_name,
                                      menuMap[name].location.address
                                    ), '_blank')}
                                  className="p-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-all shadow-sm hover:shadow group"
                                  title="네이버 지도에서 보기"
                                >
                                  <svg className="w-4 h-4 text-green-600 group-hover:text-green-700" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => window.open(
                                    menuMap[name].location.directions_url || getDirectionsUrl(
                                      menuMap[name].location.latitude,
                                      menuMap[name].location.longitude,
                                      menuMap[name].building_name,
                                      menuMap[name].location.address
                                    ), '_blank')}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all shadow-sm hover:shadow group"
                                  title="길찾기"
                                >
                                  <svg className="w-4 h-4 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 메뉴 행 - 점심/저녁 토글이 각 셀에 포함 */}
                <tr>
                  <th className="p-4 border-r border-slate-200 sticky left-0 z-10 bg-white">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-xs font-bold text-slate-500 mb-2">
                        식사 시간
                      </span>
                      {/* 전체 토글 버튼 */}
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={() => setMealType("점심")}
                          className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            mealType === "점심"
                              ? "bg-orange-500 text-white shadow-sm scale-105"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          <span className="mr-1">☀️</span>
                          점심
                        </button>
                        <button
                          onClick={() => setMealType("저녁")}
                          className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            mealType === "저녁"
                              ? "bg-indigo-500 text-white shadow-sm scale-105"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          <span className="mr-1">🌙</span>
                          저녁
                        </button>
                      </div>
                    </div>
                  </th>
                  {cafeteriaKeys.map((name, idx) => {
                    const { menu: lunchMenu, price: lunchPrice } = getMenuData(name, activeDay, "점심");
                    const { menu: dinnerMenu, price: dinnerPrice } = getMenuData(name, activeDay, "저녁");
                    const currentMenu = mealType === "점심" ? lunchMenu : dinnerMenu;
                    const currentPrice = mealType === "점심" ? lunchPrice : dinnerPrice;
                    const priceClass = mealType === "점심"
                      ? "bg-orange-50 border-orange-100 text-orange-700"
                      : "bg-indigo-50 border-indigo-100 text-indigo-700";

                    return (
                      <td
                        key={idx}
                        className="p-4 align-top bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="menu-container min-h-[200px]">
                          {/* 메뉴 내용 */}
                          <div key={mealType} className="menu-transition-enter">
                            {/* 가격 정보는 메뉴와 상관없이 표시 */}
                            {currentPrice && (
                              <div className={`inline-block px-2 py-0.5 border rounded text-xs font-bold mb-1 ${priceClass}`}>
                                {currentPrice}
                              </div>
                            )}
                            <MenuList
                              items={currentMenu}
                              restaurantId={menuMap[name]?.id}
                              restaurantName={name}
                              day={activeDay}
                              mealType={mealType}
                              dateRange={currentDate}
                              popularMenus={popularMenusMap[menuMap[name]?.id] || {}}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 방문자수 표시 */}
        <div className="w-full max-w-[1800px] px-3 sm:px-4 mt-3 sm:mt-4 mb-2">
          <div className="text-center text-xs sm:text-sm text-slate-600">
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
        <div className="text-center text-xs text-slate-400 py-4 sm:py-6 px-3">
          <span className="hidden md:inline">
            * 테이블 왼쪽의 버튼을 클릭하여 점심/저녁을 전환하세요.
            <br />* 좌우로 스크롤하여 더 많은 식당을 확인하세요.
          </span>
          <span className="md:hidden">
            * 상단 버튼으로 점심/저녁을 전환할 수 있어요.
          </span>
        </div>

      </main>

      {/* 하단 푸터 */}
      <Footer
        onOpenComplaint={() => setIsComplaintModalOpen(true)}
        onOpenAdInquiry={() => setIsAdInquiryModalOpen(true)}
      />

      {/* 이미지 모달 */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="bg-white rounded-xl overflow-hidden w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h3 className="font-bold text-sm sm:text-base text-slate-800">식단표 원본</h3>
              <button
                onClick={() => setModalImage(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                <IconX />
              </button>
            </div>
            <div className="overflow-auto p-0 bg-slate-900 flex-1 flex items-center justify-center min-h-[200px] sm:min-h-[300px]">
              <img
                src={modalImage}
                alt="Original Menu"
                className="max-w-full h-auto object-contain"
                onError={(e) => {
                  console.error('[이미지 로딩 실패] URL:', modalImage);
                  console.error('[이미지 로딩 실패] Error:', e);
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

      {/* 광고문의 모달 */}
      <AdInquiryModal
        isOpen={isAdInquiryModalOpen}
        onClose={() => setIsAdInquiryModalOpen(false)}
      />

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 프로필 설정 모달 */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* 실시간 채팅 */}
      <ChatWindowV2
        restaurants={restaurants}
        isOpen={isChatWindowOpen}
        onClose={() => setIsChatWindowOpen(false)}
        messages={messages}
        loading={chatLoading}
        error={chatError}
        sending={sending}
        sendMessage={sendMessage}
        chatDate={chatDate}
        isInputEnabled={isInputEnabled}
        displayName={displayName}
        isAnonymous={isAnonymous}
        anonymousMessagesRemaining={anonymousMessagesRemaining}
      />

      {/* 커뮤니티 모달 */}
      <CommunityModal
        isOpen={isCommunityModalOpen}
        onClose={() => setIsCommunityModalOpen(false)}
        menuData={menuData}
      />

      {/* 데이터 업데이트 알림 토스트 */}
      {showUpdateNotification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-[90vw] sm:max-w-md">
            <div className="flex-1">
              <p className="font-bold text-sm sm:text-base">새로운 메뉴 업데이트!</p>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">최신 메뉴로 새로고침하세요</p>
            </div>
            <button
              onClick={() => loadMenuData(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              새로고침
            </button>
            <button
              onClick={() => setShowUpdateNotification(false)}
              className="p-1 hover:bg-blue-700 rounded-full transition-colors"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
