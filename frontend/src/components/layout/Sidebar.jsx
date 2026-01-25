// Sidebar.jsx - 관리자 사이드바 네비게이션

const Sidebar = ({ currentTab, onTabChange, unreadCounts = {} }) => {
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
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all
          ${
            isActive
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }
        `}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{item.icon}</span>
          <span>{item.label}</span>
        </div>
        {item.badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col h-full border-r border-slate-700">
      {/* 로고 영역 */}
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">센텀밥집 관리자</h1>
        <p className="text-xs text-slate-400 mt-1">Admin Dashboard</p>
      </div>

      {/* 메뉴 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuItems.map((menuItem, index) => {
          if (menuItem.section) {
            // 섹션 헤더가 있는 경우
            return (
              <div key={`section-${index}`}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  {menuItem.section}
                </h3>
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
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400">Version 2.0.0</p>
        <p className="text-xs text-slate-500 mt-1">
          © {new Date().getFullYear()} Centum Bob
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
