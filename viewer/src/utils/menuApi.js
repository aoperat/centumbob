// Menu Data API - Supabase 직접 조회
import { supabase, supabaseUrl } from './supabaseClient';
import { getCurrentWeekRange } from './dateCalculator';

/**
 * 메뉴 데이터 변경사항 실시간 구독
 * @param {Function} callback - 변경 시 호출될 콜백 함수
 * @returns {Object} Supabase 구독 객체 (unsubscribe 메서드 포함)
 */
export const subscribeToMenuChanges = (callback) => {
  const menuSubscription = supabase
    .channel('menu-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'centumbob_menu_data',
      },
      (payload) => callback({ type: 'menu_data', payload })
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'centumbob_cafeteria_restaurants',
      },
      (payload) => callback({ type: 'restaurant', payload })
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'centumbob_date_ranges',
      },
      (payload) => callback({ type: 'date_range', payload })
    )
    .subscribe();

  return menuSubscription;
};

/**
 * 이미지 경로를 표시 가능한 URL로 변환
 * - http:// / https:// → 그대로 사용 (Supabase public URL 등)
 * - uploads/ → legacy 로컬 경로 (filename 추출 후 basePath + images/)
 * - 그 외 → Supabase Storage 경로
 * @param {string} imagePath - DB에 저장된 이미지 경로
 * @param {string} basePath - viewer base path (예: "/centumbob_v2/")
 * @returns {string|null} 접근 가능한 이미지 URL
 */
const resolveMenuImageUrl = (imagePath, basePath) => {
  if (!imagePath) return null;

  // 이미 절대 URL인 경우
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Legacy 로컬 경로 (uploads/ 로 시작)
  if (imagePath.startsWith('uploads/') || imagePath.startsWith('uploads\\')) {
    const fileName = imagePath.split('/').pop().split('\\').pop();
    return `${basePath}images/${fileName}`.replace(/\/\//g, '/');
  }

  // Supabase Storage 경로
  return `${supabaseUrl}/storage/v1/object/public/centumbob-menu-images/${imagePath}`;
};

/**
 * 활성화된 날짜 범위의 메뉴 데이터 조회
 * - 한국 시간 기준 현재 주차를 자동으로 계산
 * - 토요일 자정(00:00)에 다음 주로 전환
 * @returns {Promise<Array>} 메뉴 데이터 배열 (viewer 형식으로 변환됨)
 */
export const getActiveMenuData = async () => {
  try {
    // 1. 현재 주차 자동 계산 (한국 시간 기준)
    const { dateRange: activeDateRange } = getCurrentWeekRange();

    // 2. 활성 식당 목록 조회
    const { data: restaurants, error: restError } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('id');

    if (restError) throw restError;

    if (!restaurants || restaurants.length === 0) {
      return [];
    }

    // 3. 활성 날짜 범위의 메뉴 데이터 조회
    const { data: menuDataList, error: menuError } = await supabase
      .from('centumbob_menu_data')
      .select('*')
      .eq('date_range', activeDateRange);

    if (menuError) throw menuError;

    // 4. 메뉴 데이터 맵 생성 (restaurant_id -> 메뉴 데이터)
    const menuDataMap = {};
    menuDataList?.forEach((dbData) => {
      menuDataMap[dbData.restaurant_id] = dbData;
    });

    // 5. 모든 활성 식당을 viewer 형식으로 변환 (메뉴 데이터가 없어도 표시)
    const viewerData = [];

    restaurants.forEach((restaurant) => {
      try {
        // 해당 식당의 메뉴 데이터 찾기 (없을 수도 있음)
        const dbData = menuDataMap[restaurant.id];

        // 메뉴 데이터가 없으면 빈 메뉴로 생성
        const emptyMenus = {
          월: { lunch: [], dinner: [] },
          화: { lunch: [], dinner: [] },
          수: { lunch: [], dinner: [] },
          목: { lunch: [], dinner: [] },
          금: { lunch: [], dinner: [] },
        };

        // 이미지 URL 생성
        let imageUrlsByDay = null;
        let imageUrlsArray = [];
        const days = ['월', '화', '수', '목', '금'];
        const basePath = import.meta.env.BASE_URL || '/centumbob_v2/';

        // image_paths가 JSON 문자열인 경우 파싱
        let imagePaths = dbData?.image_paths;
        if (typeof imagePaths === 'string') {
          try {
            imagePaths = JSON.parse(imagePaths);
          } catch {
            imagePaths = null;
          }
        }

        // 개별요일 모드 (image_paths 객체)
        if (imagePaths && typeof imagePaths === 'object') {
          imageUrlsByDay = {};
          const uniqueImages = new Set();

          days.forEach((day) => {
            if (imagePaths[day]) {
              const fullUrl = resolveMenuImageUrl(imagePaths[day], basePath);
              if (fullUrl) {
                imageUrlsByDay[day] = fullUrl;
                uniqueImages.add(fullUrl);
              }
            }
          });

          imageUrlsArray = Array.from(uniqueImages);
        }
        // 전체요일 모드 (image_path 단일 문자열) - 모든 요일에 동일 이미지
        else if (dbData?.image_path) {
          const fullUrl = resolveMenuImageUrl(dbData.image_path, basePath);

          if (fullUrl) {
            imageUrlsByDay = {};
            days.forEach((day) => {
              imageUrlsByDay[day] = fullUrl;
            });
            imageUrlsArray = [fullUrl];
          }
        }

        // Viewer 형식으로 변환 (기존 menu-data.json 구조와 동일하게)
        const priceLunch = dbData?.price_lunch || restaurant.price_lunch || '';
        const priceDinner = dbData?.price_dinner || restaurant.price_dinner || '';

        // 가격 포맷팅 헬퍼 함수 (NaN 방지)
        const formatPrice = (price) => {
          if (!price) return '';

          // 이미 포맷팅된 가격인지 확인 ("원"으로 끝나면 그대로 반환)
          if (typeof price === 'string' && price.trim().endsWith('원')) {
            return price.trim();
          }

          // 쉼표 제거 후 숫자로 변환 시도
          const cleanPrice = typeof price === 'string' ? price.replace(/,/g, '') : price;
          const numPrice = Number(cleanPrice);
          if (isNaN(numPrice)) return '';
          return `${numPrice.toLocaleString()}원`;
        };

        const viewerItem = {
          id: restaurant.id,
          name: restaurant.name,
          building_name: restaurant.building_name || '',
          sort_order: restaurant.sort_order,
          type: 'text',
          has_dinner: restaurant.has_dinner,
          price: {
            lunch: formatPrice(priceLunch),
            dinner: formatPrice(priceDinner),
          },
          // 위치 정보 추가
          location: {
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            address: restaurant.address,
            map_url: restaurant.map_url,
            directions_url: restaurant.directions_url,
          },
          data: {
            date: dbData?.date_range || activeDateRange,
            menus: dbData
              ? transformMenusForViewer(dbData.menus, dbData.excluded_menu_items)
              : transformMenusForViewer(emptyMenus, []),
          },
          // imageUrls와 imageUrlsByDay는 data 밖에 최상위 레벨로
          imageUrls: imageUrlsArray,
          imageUrlsByDay: imageUrlsByDay,
        };

        viewerData.push(viewerItem);
      } catch {
        // 변환 오류 무시 (해당 식당 스킵)
      }
    });

    // sort_order로 정렬 (동일한 sort_order는 id로 2차 정렬)
    viewerData.sort((a, b) => {
      const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.id || 0) - (b.id || 0);
    });

    return viewerData;
  } catch (error) {
    throw error;
  }
};

/**
 * DB 형식 메뉴를 Viewer 형식으로 변환
 * DB: { "월": { "lunch": [...], "dinner": [...] }, ... }
 * Viewer: { "월": { "점심": [...], "저녁": [...] }, ... }
 */
const transformMenusForViewer = (dbMenus, excludedMenuItems) => {
  const viewerMenus = {};
  const excludedSet = new Set(excludedMenuItems || []);
  const days = ['월', '화', '수', '목', '금'];

  days.forEach((day) => {
    const dayMenu = dbMenus[day] || { lunch: [], dinner: [] };

    // 제외 메뉴 필터링 함수
    const filterMenu = (items) => {
      if (!Array.isArray(items)) return [];
      return items.filter((item) => !excludedSet.has(item));
    };

    viewerMenus[day] = {
      점심: filterMenu(dayMenu.lunch || []),
      저녁: filterMenu(dayMenu.dinner || []),
    };
  });

  return viewerMenus;
};

/**
 * 특정 식당의 메뉴 데이터 조회
 * @param {number} restaurantId - 식당 ID
 * @param {string} dateRange - 날짜 범위 (예: "1월 26일 ~ 1월 30일")
 * @returns {Promise<Object>} 메뉴 데이터
 */
export const getRestaurantMenu = async (restaurantId, dateRange) => {
  try {
    const { data, error } = await supabase
      .from('centumbob_menu_data')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('date_range', dateRange)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * 모든 식당 목록 조회
 * @returns {Promise<Array>} 식당 목록
 */
export const getRestaurants = async () => {
  try {
    const { data, error } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('id');

    if (error) throw error;

    return data || [];
  } catch (error) {
    throw error;
  }
};

export default {
  getActiveMenuData,
  getRestaurantMenu,
  getRestaurants,
  subscribeToMenuChanges,
};
