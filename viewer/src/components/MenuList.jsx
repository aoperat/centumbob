import { useState, useEffect } from 'react';
import { toggleMenuLike, getMenuLikes, getUserLikedMenus } from '../utils/menuLikesApi';

const MenuList = ({
  items,
  restaurantId,
  restaurantName,
  day,
  mealType,
  dateRange,
  showLikes = true,
  popularMenus = {}, // 식당별 역대 인기 메뉴 { menuItem: likeCount }
}) => {
  const [likeCounts, setLikeCounts] = useState({});
  const [userLiked, setUserLiked] = useState([]);
  const [loadingItem, setLoadingItem] = useState(null);

  // 좋아요 데이터 로드
  useEffect(() => {
    if (!showLikes || !restaurantId || !day || !mealType || !dateRange) return;

    const loadLikes = async () => {
      try {
        const [counts, liked] = await Promise.all([
          getMenuLikes({ restaurantId, day, mealType, dateRange }),
          getUserLikedMenus({ restaurantId, day, mealType, dateRange }),
        ]);
        setLikeCounts(counts);
        setUserLiked(liked);
      } catch (error) {
        console.error('좋아요 데이터 로드 실패:', error);
      }
    };

    loadLikes();
  }, [showLikes, restaurantId, day, mealType, dateRange]);

  // 인기 메뉴인지 확인 (역대 좋아요 기준)
  const isPopularMenu = (menuItem) => {
    return popularMenus[menuItem] && popularMenus[menuItem] >= 2;
  };

  const getPopularCount = (menuItem) => {
    return popularMenus[menuItem] || 0;
  };

  // 좋아요 토글
  const handleLike = async (menuItem) => {
    if (!restaurantId || !day || !mealType || !dateRange) return;

    setLoadingItem(menuItem);
    try {
      const result = await toggleMenuLike({
        restaurantId,
        restaurantName,
        day,
        mealType,
        menuItem,
        dateRange,
      });

      // 상태 업데이트
      if (result.action === 'liked') {
        setUserLiked(prev => [...prev, menuItem]);
        setLikeCounts(prev => ({
          ...prev,
          [menuItem]: (prev[menuItem] || 0) + 1,
        }));
      } else {
        setUserLiked(prev => prev.filter(m => m !== menuItem));
        setLikeCounts(prev => ({
          ...prev,
          [menuItem]: Math.max((prev[menuItem] || 1) - 1, 0),
        }));
      }
    } catch (error) {
      console.error('좋아요 실패:', error);
    } finally {
      setLoadingItem(null);
    }
  };

  if (!items || items.length === 0) {
    return <p className="text-gray-400 text-xs italic">정보 없음</p>;
  }

  const canLike = showLikes && restaurantId && day && mealType && dateRange;

  return (
    <ul className="space-y-1 mt-1 sm:mt-2">
      {items.map((item, idx) => {
        const isLiked = userLiked.includes(item);
        const likeCount = likeCounts[item] || 0;
        const isLoading = loadingItem === item;
        const isPopular = isPopularMenu(item);
        const popularCount = getPopularCount(item);

        return (
          <li
            key={`${item}-${idx}`}
            className={`
              text-xs sm:text-sm leading-relaxed sm:leading-snug break-keep flex items-center justify-between gap-2 group
              ${isPopular ? 'text-slate-800' : 'text-slate-700'}
            `}
          >
            <span className={`flex-1 flex items-center gap-1 ${isPopular ? 'font-medium' : ''}`}>
              <span className={isPopular ? 'bg-yellow-200/70 px-1 -mx-1 rounded' : ''}>
                · {item}
              </span>
              {isPopular && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {popularCount}
                </span>
              )}
            </span>

            {canLike && (
              <button
                onClick={() => handleLike(item)}
                disabled={isLoading}
                className={`
                  flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all
                  ${isLiked
                    ? 'bg-red-50 text-red-500'
                    : 'bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100'
                  }
                  hover:bg-red-100 hover:text-red-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={isLiked ? '좋아요 취소' : '좋아요'}
              >
                <svg
                  className={`w-3 h-3 ${isLoading ? 'animate-pulse' : ''}`}
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {likeCount > 0 && (
                  <span className="font-medium">{likeCount}</span>
                )}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default MenuList;
