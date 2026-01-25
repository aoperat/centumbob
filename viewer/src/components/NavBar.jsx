import { useState, useEffect, useRef } from 'react';
import { IconUtensils, IconCalendar, IconCommunity } from './Icons';
import UserMenu from './UserMenu';

// 햄버거 아이콘
function IconMenu({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

// 닫기 아이콘
function IconClose({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const NavBar = ({
  currentDate,
  isAuthenticated,
  onOpenAuth,
  onOpenProfile,
  onOpenCommunity,
  activeDay,
  onDayChange,
  todayDay,
  isWeekend,
  user,
  onLogout,
}) => {
  const days = ["월", "화", "수", "목", "금"];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  // 모바일 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // 모바일 메뉴 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // 모바일 메뉴 항목 클릭 핸들러
  const handleMobileMenuClick = (action) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <header className="bg-white w-full sticky top-0 z-20 shadow-sm border-b border-gray-200">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          {/* 로고 및 타이틀 */}
          <div className="flex flex-col">
            <h1 className="text-base sm:text-xl font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
              <span className="bg-blue-600 text-white p-1 sm:p-1.5 rounded-lg">
                <IconUtensils className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <span>센텀 밥집</span>
            </h1>
            {currentDate && (
              <span className="md:hidden text-xs text-slate-500 ml-9">
                {currentDate}
              </span>
            )}
          </div>

          {/* 데스크탑: 네비게이션 버튼들 */}
          <div className="hidden md:flex items-center gap-3">
            {/* 날짜 표시 */}
            {currentDate && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                <IconCalendar /> {currentDate}
              </span>
            )}

            {/* 로그인 / 사용자 메뉴 */}
            {isAuthenticated ? (
              <UserMenu onOpenProfile={onOpenProfile} />
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
              >
                로그인
              </button>
            )}

            {/* 오늘 뭐 먹지? */}
            <button
              onClick={onOpenCommunity}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <IconCommunity className="w-4 h-4" />
              오늘 뭐 먹지?
            </button>
          </div>

          {/* 모바일: 햄버거 메뉴 */}
          <div className="md:hidden" ref={mobileMenuRef}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative z-[60]"
              aria-label="메뉴"
            >
              {isMobileMenuOpen ? (
                <IconClose className="w-6 h-6" />
              ) : (
                <IconMenu className="w-6 h-6" />
              )}
            </button>

            {/* 백드롭 오버레이 */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fadeIn"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            {/* 모바일 드롭다운 메뉴 */}
            {isMobileMenuOpen && (
              <div className="fixed right-3 top-14 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-slideDown">
                {/* 날짜 표시 */}
                {currentDate && (
                  <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">
                    📅 {currentDate}
                  </div>
                )}

                {/* 로그인 상태 */}
                {isAuthenticated && user ? (
                  <div className="px-4 py-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {user.nickname?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{user.nickname}</div>
                        <div className="text-xs text-slate-500">@{user.username}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 메뉴 항목들 */}
                {!isAuthenticated && (
                  <button
                    onClick={() => handleMobileMenuClick(onOpenAuth)}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">👤</span>
                    로그인
                  </button>
                )}

                {isAuthenticated && (
                  <button
                    onClick={() => handleMobileMenuClick(onOpenProfile)}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    프로필 설정
                  </button>
                )}

                <button
                  onClick={() => handleMobileMenuClick(onOpenCommunity)}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-3"
                >
                  <IconCommunity className="w-5 h-5" />
                  오늘 뭐 먹지?
                </button>

                {isAuthenticated && (
                  <>
                    <div className="border-t border-slate-200 my-2"></div>
                    <button
                      onClick={() => handleMobileMenuClick(onLogout)}
                      className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      로그아웃
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 요일 선택 탭 */}
        <div className="flex justify-between bg-slate-100 p-1 rounded-xl">
          {days.map((day) => {
            const isActive = activeDay === day;
            const isToday = !isWeekend && day === todayDay;
            return (
              <button
                key={day}
                onClick={() => onDayChange(day)}
                className={`
                  relative flex-1 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-bold transition-all duration-200 min-h-[44px] sm:min-h-0
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
  );
};

export default NavBar;
