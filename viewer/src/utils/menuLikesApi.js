// Menu Likes API - Supabase 직접 조회
import { createClient } from '@supabase/supabase-js';
import { getAnonymousId } from './anonymousUser';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 메뉴 좋아요 토글 (좋아요/취소)
 */
export const toggleMenuLike = async ({
  restaurantId,
  restaurantName,
  day,
  mealType,
  menuItem,
  dateRange,
}) => {
  const anonymousId = getAnonymousId();

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabase
    .from('centumbob_menu_likes')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('day', day)
    .eq('meal_type', mealType)
    .eq('menu_item', menuItem)
    .eq('date_range', dateRange)
    .eq('anonymous_id', anonymousId)
    .single();

  if (existing) {
    // 좋아요 취소 (자신의 좋아요만 삭제되도록 anonymous_id 조건 추가)
    const { error } = await supabase
      .from('centumbob_menu_likes')
      .delete()
      .eq('id', existing.id)
      .eq('anonymous_id', anonymousId);

    if (error) throw error;
    return { action: 'unliked' };
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('centumbob_menu_likes')
      .insert({
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        day,
        meal_type: mealType,
        menu_item: menuItem,
        date_range: dateRange,
        anonymous_id: anonymousId,
      });

    if (error) throw error;
    return { action: 'liked' };
  }
};

/**
 * 특정 식당/요일/식사의 메뉴별 좋아요 수 조회
 */
export const getMenuLikes = async ({ restaurantId, day, mealType, dateRange }) => {
  const { data, error } = await supabase
    .from('centumbob_menu_likes')
    .select('menu_item')
    .eq('restaurant_id', restaurantId)
    .eq('day', day)
    .eq('meal_type', mealType)
    .eq('date_range', dateRange);

  if (error) throw error;

  // 메뉴별 좋아요 수 집계
  const likeCounts = {};
  data?.forEach(({ menu_item }) => {
    likeCounts[menu_item] = (likeCounts[menu_item] || 0) + 1;
  });

  return likeCounts;
};

/**
 * 사용자가 좋아요한 메뉴 목록 조회
 */
export const getUserLikedMenus = async ({ restaurantId, day, mealType, dateRange }) => {
  const anonymousId = getAnonymousId();

  const { data, error } = await supabase
    .from('centumbob_menu_likes')
    .select('menu_item')
    .eq('restaurant_id', restaurantId)
    .eq('day', day)
    .eq('meal_type', mealType)
    .eq('date_range', dateRange)
    .eq('anonymous_id', anonymousId);

  if (error) throw error;

  return data?.map(d => d.menu_item) || [];
};

/**
 * 전체 인기 메뉴 조회 (날짜 범위 기준)
 */
export const getPopularMenus = async (dateRange, limit = 10) => {
  const { data, error } = await supabase
    .from('centumbob_menu_likes')
    .select('menu_item, restaurant_name')
    .eq('date_range', dateRange);

  if (error) throw error;

  // 집계
  const menuCounts = {};
  data?.forEach(({ menu_item, restaurant_name }) => {
    const key = `${menu_item}|${restaurant_name}`;
    if (!menuCounts[key]) {
      menuCounts[key] = { menu_item, restaurant_name, count: 0 };
    }
    menuCounts[key].count++;
  });

  // 정렬 후 반환
  return Object.values(menuCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * 식당별 역대 인기 메뉴 조회 (전체 기간 집계)
 * @param {number} restaurantId - 식당 ID
 * @param {number} minLikes - 최소 좋아요 수 (기본값: 2)
 * @returns {Promise<Object>} { menuItem: likeCount }
 */
export const getRestaurantPopularMenus = async (restaurantId, minLikes = 2) => {
  const { data, error } = await supabase
    .from('centumbob_menu_likes')
    .select('menu_item')
    .eq('restaurant_id', restaurantId);

  if (error) throw error;

  // 메뉴별 좋아요 수 집계
  const menuCounts = {};
  data?.forEach(({ menu_item }) => {
    menuCounts[menu_item] = (menuCounts[menu_item] || 0) + 1;
  });

  // 최소 좋아요 수 이상인 메뉴만 반환
  const popularMenus = {};
  Object.entries(menuCounts).forEach(([menu, count]) => {
    if (count >= minLikes) {
      popularMenus[menu] = count;
    }
  });

  return popularMenus;
};

/**
 * 모든 식당의 역대 인기 메뉴 조회 (한 번에 로드)
 * @param {number} minLikes - 최소 좋아요 수 (기본값: 2)
 * @returns {Promise<Object>} { restaurantId: { menuItem: likeCount } }
 */
export const getAllRestaurantsPopularMenus = async (minLikes = 2) => {
  const { data, error } = await supabase
    .from('centumbob_menu_likes')
    .select('restaurant_id, menu_item');

  if (error) throw error;

  // 식당별 메뉴별 좋아요 수 집계
  const result = {};
  data?.forEach(({ restaurant_id, menu_item }) => {
    if (!result[restaurant_id]) {
      result[restaurant_id] = {};
    }
    result[restaurant_id][menu_item] = (result[restaurant_id][menu_item] || 0) + 1;
  });

  // 최소 좋아요 수 이상인 메뉴만 필터링
  Object.keys(result).forEach((restaurantId) => {
    const menus = result[restaurantId];
    result[restaurantId] = {};
    Object.entries(menus).forEach(([menu, count]) => {
      if (count >= minLikes) {
        result[restaurantId][menu] = count;
      }
    });
  });

  return result;
};

export default {
  toggleMenuLike,
  getMenuLikes,
  getUserLikedMenus,
  getPopularMenus,
  getRestaurantPopularMenus,
  getAllRestaurantsPopularMenus,
};
