// AdminLayout.jsx - 관리자 페이지 레이아웃

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";

const AdminLayout = ({ currentTab, onTabChange, children }) => {
  // localStorage에서 사이드바 상태 불러오기 (기본값: true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('centumbob_admin_sidebar_collapsed');
    return saved === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    complaints: 0,
    ad_inquiries: 0,
  });

  // 사이드바 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('centumbob_admin_sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // 읽지 않은 항목 수 가져오기
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const response = await fetch("http://localhost:9101/api/admin/dashboard-summary");
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setUnreadCounts({
              complaints: result.data.complaints?.unread || 0,
              ad_inquiries: result.data.ad_inquiries?.unread || 0,
            });
          }
        }
      } catch (error) {
        console.error("읽지 않은 항목 조회 오류:", error);
      }
    };

    fetchUnreadCounts();
    // 30초마다 자동 갱신
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [currentTab]); // 탭 변경 시 갱신

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 헤더 */}
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {/* 데스크톱: 사이드바 축소/확장 버튼 */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:block p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title={isSidebarCollapsed ? "사이드바 확장" : "사이드바 축소"}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isSidebarCollapsed ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                )}
              </svg>
            </button>

            {/* 모바일: 사이드바 열기 버튼 */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl font-bold">센텀밥집 관리 시스템</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden md:block transition-all duration-300">
          <Sidebar
            currentTab={currentTab}
            onTabChange={onTabChange}
            unreadCounts={unreadCounts}
            isCollapsed={isSidebarCollapsed}
          />
        </aside>

        {/* 모바일 사이드바 */}
        <aside
          className={`
            ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:hidden transition-transform duration-300
            fixed inset-y-0 left-0 z-40
          `}
        >
          <Sidebar
            currentTab={currentTab}
            onTabChange={(tab) => {
              onTabChange(tab);
              setIsMobileSidebarOpen(false);
            }}
            unreadCounts={unreadCounts}
            isCollapsed={false}
          />
        </aside>

        {/* 사이드바 오버레이 (모바일) */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* 콘텐츠 영역 */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
