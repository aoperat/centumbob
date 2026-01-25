import { useState, useEffect } from 'react';
import { getPopularMenus } from '../utils/menuLikesApi';

const PopularMenus = ({ dateRange, maxItems = 5 }) => {
  const [popularMenus, setPopularMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!dateRange) {
      setLoading(false);
      return;
    }

    const loadPopular = async () => {
      try {
        const data = await getPopularMenus(dateRange, 20);
        setPopularMenus(data);
      } catch (error) {
        console.error('인기 메뉴 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPopular();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-300 border-t-red-600"></div>
        </div>
      </div>
    );
  }

  if (popularMenus.length === 0) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">❤️</span>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">이번 주 인기 메뉴</h3>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm text-center py-2">
          아직 좋아요가 없습니다. 마음에 드는 메뉴에 좋아요를 눌러주세요!
        </p>
      </div>
    );
  }

  const displayMenus = isExpanded ? popularMenus : popularMenus.slice(0, maxItems);

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">❤️</span>
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">이번 주 인기 메뉴</h3>
        </div>
        <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full">
          {popularMenus.reduce((sum, m) => sum + m.count, 0)}개 좋아요
        </span>
      </div>

      <div className="space-y-2">
        {displayMenus.map((item, idx) => (
          <div
            key={`${item.menu_item}-${item.restaurant_name}`}
            className="flex items-center gap-3 bg-white/70 rounded-lg px-3 py-2"
          >
            {/* 순위 */}
            <div className={`
              w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
              ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : ''}
              ${idx === 1 ? 'bg-slate-300 text-slate-700' : ''}
              ${idx === 2 ? 'bg-orange-300 text-orange-800' : ''}
              ${idx > 2 ? 'bg-slate-100 text-slate-500' : ''}
            `}>
              {idx + 1}
            </div>

            {/* 메뉴 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {item.menu_item}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {item.restaurant_name}
              </p>
            </div>

            {/* 좋아요 수 */}
            <div className="flex items-center gap-1 text-red-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm font-bold">{item.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 더보기/접기 버튼 */}
      {popularMenus.length > maxItems && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-white/50 rounded-lg transition-colors"
        >
          {isExpanded ? '접기 ▲' : `더보기 (${popularMenus.length - maxItems}개) ▼`}
        </button>
      )}
    </div>
  );
};

export default PopularMenus;
