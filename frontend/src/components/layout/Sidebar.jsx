// Sidebar.jsx - 관리자 사이드바 네비게이션

const Sidebar = ({ currentTab, onTabChange, unreadCounts = {}, isCollapsed = false }) => {
  const menuItems = [
    {
      id: "dashboard",
      label: "대시보드",
      icon: "📊",
      section: null,
    },
    {
      section: "메뉴 관리",
      items: [
        {
          id: "entry",
          label: "데이터 입력",
          icon: "📝",
        },
        {
          id: "management",
          label: "기준 데이터 관리",
          icon: "⚙️",
        },
      ],
    },
    {
      section: "고객 지원",
      items: [
        {
          id: "complaint-admin",
          label: "민원 관리",
          icon: "💬",
          badge: unreadCounts.complaints || 0,
        },
        {
          id: "ad-admin",
          label: "광고문의 관리",
          icon: "📢",
          badge: unreadCounts.ad_inquiries || 0,
        },
        {
          id: "chat-monitor",
          label: "채팅 모니터",
          icon: "💭",
        },
      ],
    },
    {
      section: "콘텐츠",
      items: [
        {
          id: "blog",
          label: "블로그 생성",
          icon: "📰",
        },
      ],
    },
    {
      section: "개발자",
      items: [
        {
          id: "api-guide",
          label: "API 안내",
          icon: "🔧",
        },
      ],
    },
  ];

  const renderMenuItem = (item) => {
    const isActive = currentTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        title={isCollapsed ? item.label : ''}
        className={`
          w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}
          ${isCollapsed ? 'px-2' : 'px-4'} py-2.5 rounded-lg text-sm font-medium transition-all
          ${
            isActive
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }
        `}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <span className="text-lg relative">
            {item.icon}
            {/* 축소 시 배지를 아이콘 우측 상단에 표시 */}
            {isCollapsed && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            )}
          </span>
          {!isCollapsed && <span>{item.label}</span>}
        </div>
        {!isCollapsed && item.badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-800 text-white flex flex-col h-full border-r border-slate-700 transition-all duration-300`}>
      {/* 로고 영역 */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-b border-slate-700`}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <span className="text-2xl">🍚</span>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">센텀밥집 관리자</h1>
            <p className="text-xs text-slate-400 mt-1">Admin Dashboard</p>
          </>
        )}
      </div>

      {/* 메뉴 영역 */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-4'} ${isCollapsed ? 'space-y-2' : 'space-y-6'}`}>
        {menuItems.map((menuItem, index) => {
          if (menuItem.section) {
            // 섹션 헤더가 있는 경우
            return (
              <div key={`section-${index}`}>
                {!isCollapsed && (
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                    {menuItem.section}
                  </h3>
                )}
                {/* 축소 시 구분선 표시 */}
                {isCollapsed && index > 0 && (
                  <div className="border-t border-slate-700 my-2" />
                )}
                <div className="space-y-1">
                  {menuItem.items.map((item) => renderMenuItem(item))}
                </div>
              </div>
            );
          } else {
            // 독립 메뉴 아이템
            return renderMenuItem(menuItem);
          }
        })}
      </div>

      {/* 하단 정보 */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-slate-700`}>
        {isCollapsed ? (
          <p className="text-[10px] text-slate-500 text-center">v2.0</p>
        ) : (
          <>
            <p className="text-xs text-slate-400">Version 2.0.0</p>
            <p className="text-xs text-slate-500 mt-1">
              © {new Date().getFullYear()} Centum Bob
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
