// Menu Data API - Supabase 직접 조회
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.');
}

// Safari 캐시 문제 방지를 위한 fetch 옵션
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      // Headers 객체를 일반 객체로 변환 (Headers 객체는 spread가 안됨)
      const existingHeaders = options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : (options.headers || {});

      return fetch(url, {
        ...options,
        cache: 'no-store', // 브라우저 캐시 완전 비활성화
        headers: {
          ...existingHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
    },
  },
});

/**
 * 메뉴 데이터 변경사항 실시간 구독
 * @param {Function} callback - 변경 시 호출될 콜백 함수
 * @returns {Object} Supabase 구독 객체 (unsubscribe 메서드 포함)
 */
export const subscribeToMenuChanges = (callback) => {
  console.log('[Menu API] Realtime 구독 시작');

  // 메뉴 데이터 변경 감지
  const menuSubscription = supabase
    .channel('menu-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE 모두 감지
        schema: 'public',
        table: 'centumbob_menu_data',
      },
      (payload) => {
        console.log('[Menu API] 메뉴 데이터 변경 감지:', payload);
        callback({ type: 'menu_data', payload });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'centumbob_cafeteria_restaurants',
      },
      (payload) => {
        console.log('[Menu API] 식당 데이터 변경 감지:', payload);
        callback({ type: 'restaurant', payload });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'centumbob_date_ranges',
      },
      (payload) => {
        console.log('[Menu API] 날짜 범위 변경 감지:', payload);
        callback({ type: 'date_range', payload });
      }
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

  console.log('[resolveMenuImageUrl] 원본 경로:', imagePath);

  // 이미 절대 URL인 경우
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    console.log('[resolveMenuImageUrl] 절대 URL:', imagePath);
    return imagePath;
  }

  // Legacy 로컬 경로 (uploads/ 로 시작)
  if (imagePath.startsWith('uploads/') || imagePath.startsWith('uploads\\')) {
    const fileName = imagePath.split('/').pop().split('\\').pop();
    const resolvedPath = `${basePath}images/${fileName}`.replace(/\/\//g, '/');
    console.log('[resolveMenuImageUrl] Legacy 로컬 경로:', resolvedPath);
    return resolvedPath;
  }

  // Supabase Storage 경로
  const supabasePath = `${supabaseUrl}/storage/v1/object/public/centumbob-menu-images/${imagePath}`;
  console.log('[resolveMenuImageUrl] Supabase Storage 경로:', supabasePath);
  return supabasePath;
};

/**
 * 활성화된 날짜 범위의 메뉴 데이터 조회
 * @returns {Promise<Array>} 메뉴 데이터 배열 (viewer 형식으로 변환됨)
 */
export const getActiveMenuData = async () => {
  try {
    // 1. 활성화된 날짜 범위 조회
    const { data: activeDateRanges, error: dateError } = await supabase
      .from('centumbob_date_ranges')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('week', { ascending: false })
      .limit(1);

    if (dateError) throw dateError;

    if (!activeDateRanges || activeDateRanges.length === 0) {
      console.warn('활성화된 날짜 범위가 없습니다.');
      return [];
    }

    const activeDateRange = activeDateRanges[0].date_range;
    console.log('[Menu API] 활성 날짜 범위:', activeDateRange);

    // 2. 활성 식당 목록 조회
    const { data: restaurants, error: restError } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('id');

    if (restError) throw restError;

    if (!restaurants || restaurants.length === 0) {
      console.warn('활성화된 식당이 없습니다.');
      return [];
    }

    // 3. 활성 날짜 범위의 메뉴 데이터 조회
    const { data: menuDataList, error: menuError } = await supabase
      .from('centumbob_menu_data')
      .select('*')
      .eq('date_range', activeDateRange);

    if (menuError) throw menuError;

    console.log('[Menu API] 조회된 메뉴 데이터:', menuDataList?.length || 0);

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
          } catch (e) {
            console.error('[Menu API] image_paths JSON 파싱 실패:', e);
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

        const viewerItem = {
          id: restaurant.id,
          name: restaurant.name,
          building_name: restaurant.building_name || '',
          sort_order: restaurant.sort_order,
          type: 'text',
          has_dinner: restaurant.has_dinner,
          price: {
            lunch: priceLunch ? `${Number(priceLunch).toLocaleString()}원` : '',
            dinner: priceDinner ? `${Number(priceDinner).toLocaleString()}원` : '',
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
      } catch (transformError) {
        console.error(
          `[Menu API] 데이터 변환 오류 (${restaurant.name}):`,
          transformError
        );
      }
    });

    // sort_order로 정렬 (동일한 sort_order는 id로 2차 정렬)
    viewerData.sort((a, b) => {
      const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.id || 0) - (b.id || 0);
    });

    console.log('[Menu API] 변환된 viewer 데이터:', viewerData.length);

    return viewerData;
  } catch (error) {
    console.error('[Menu API] 메뉴 데이터 조회 오류:', error);
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
    console.error('[Menu API] 식당 메뉴 조회 오류:', error);
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
    console.error('[Menu API] 식당 목록 조회 오류:', error);
    throw error;
  }
};

export default {
  getActiveMenuData,
  getRestaurantMenu,
  getRestaurants,
  subscribeToMenuChanges,
};
