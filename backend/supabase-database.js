// Supabase Database Module
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✓ Supabase 연결 완료');

// ==================== 메뉴 데이터 CRUD ====================

// 데이터 삽입 또는 업데이트
export const saveMenuData = async (data) => {
  const {
    restaurant_name,
    restaurant_id,
    date_range,
    price_lunch,
    price_dinner,
    menus,
    image_path,
    image_paths,
    excluded_menu_items,
  } = data;

  // restaurant_id가 없고 restaurant_name이 있으면 restaurant_id 찾기
  let finalRestaurantId = restaurant_id;
  let finalRestaurantName = restaurant_name;

  if (!finalRestaurantId && restaurant_name) {
    const { data: restaurant, error } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('id, name')
      .eq('name', restaurant_name)
      .single();

    if (restaurant && !error) {
      finalRestaurantId = restaurant.id;
      finalRestaurantName = restaurant.name;
    }
  } else if (finalRestaurantId && !restaurant_name) {
    const { data: restaurant, error } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('id, name')
      .eq('id', finalRestaurantId)
      .single();

    if (restaurant && !error) {
      finalRestaurantName = restaurant.name;
    }
  }

  if (!finalRestaurantId) {
    const errorMsg = restaurant_name
      ? `Restaurant not found: ${restaurant_name}`
      : 'restaurant_id is required';
    console.error('[saveMenuData] Error:', errorMsg);
    throw new Error(errorMsg);
  }

  const { data: result, error } = await supabase
    .from('centumbob_menu_data')
    .upsert({
      restaurant_id: finalRestaurantId,
      restaurant_name: finalRestaurantName,
      date_range,
      price_lunch: price_lunch || null,
      price_dinner: price_dinner || null,
      menus,
      image_path: image_path || null,
      image_paths: image_paths || null,
      excluded_menu_items: excluded_menu_items || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'restaurant_id,date_range'
    })
    .select()
    .single();

  if (error) {
    console.error('[saveMenuData] Supabase error:', error);
    throw error;
  }

  return result;
};

// 특정 식당/날짜 데이터 조회
export const getMenuData = async (restaurant_identifier, date_range) => {
  try {
    let query = supabase.from('centumbob_menu_data').select('*');

    // restaurant_id인지 restaurant_name인지 판단
    if (typeof restaurant_identifier === 'number' || /^\d+$/.test(String(restaurant_identifier))) {
      query = query.eq('restaurant_id', parseInt(restaurant_identifier, 10));
    } else {
      // 문자열이면 restaurant_name → restaurant_id 변환 후 조회
      const { data: restaurant, error: restError } = await supabase
        .from('centumbob_cafeteria_restaurants')
        .select('id')
        .eq('name', restaurant_identifier)
        .single();

      if (restError || !restaurant) return null;

      query = query.eq('restaurant_id', restaurant.id);
    }

    query = query.eq('date_range', date_range);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return data;
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    throw error;
  }
};

// 식당 ID로 메뉴 데이터 조회
export const getMenuDataByRestaurantId = async (restaurant_id, date_range) => {
  return getMenuData(restaurant_id, date_range);
};

// 모든 데이터 조회
export const getAllMenuData = async () => {
  try {
    const { data, error } = await supabase
      .from('centumbob_menu_data')
      .select('*')
      .order('restaurant_name')
      .order('date_range');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('모든 데이터 조회 오류:', error);
    throw error;
  }
};

// 저장된 데이터 목록 조회 (식당명, 날짜만)
export const getMenuDataList = async () => {
  const { data, error } = await supabase
    .from('centumbob_menu_data')
    .select('restaurant_name, date_range, created_at, updated_at')
    .order('restaurant_name')
    .order('date_range');

  if (error) throw error;

  return data || [];
};

// 데이터 삭제
export const deleteMenuData = async (restaurant_name, date_range) => {
  // restaurant_name으로 restaurant_id 찾기
  const { data: restaurant, error: restError } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .select('id')
    .eq('name', restaurant_name)
    .single();

  if (restError || !restaurant) {
    throw new Error(`Restaurant not found: ${restaurant_name}`);
  }

  const { error } = await supabase
    .from('centumbob_menu_data')
    .delete()
    .eq('restaurant_id', restaurant.id)
    .eq('date_range', date_range);

  if (error) throw error;

  return { changes: 1 };
};

// 식당의 모든 데이터 삭제
export const deleteAllMenuDataByRestaurant = async (restaurant_name) => {
  const { data: restaurant, error: restError } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .select('id')
    .eq('name', restaurant_name)
    .single();

  if (restError || !restaurant) {
    throw new Error(`Restaurant not found: ${restaurant_name}`);
  }

  const { error } = await supabase
    .from('centumbob_menu_data')
    .delete()
    .eq('restaurant_id', restaurant.id);

  if (error) throw error;

  return { changes: 1 };
};

// restaurant_id 기반 데이터 삭제
export const deleteMenuDataById = async (restaurant_id, date_range) => {
  const { error } = await supabase
    .from('centumbob_menu_data')
    .delete()
    .eq('restaurant_id', restaurant_id)
    .eq('date_range', date_range);

  if (error) throw error;

  return { changes: 1 };
};

// restaurant_id 기반 식당의 모든 데이터 삭제
export const deleteAllMenuDataByRestaurantId = async (restaurant_id) => {
  const { error } = await supabase
    .from('centumbob_menu_data')
    .delete()
    .eq('restaurant_id', restaurant_id);

  if (error) throw error;

  return { changes: 1 };
};

// ==================== 식당 관리 CRUD ====================

// 모든 식당 조회
export const getAllRestaurants = async () => {
  try {
    const { data, error } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('*')
      .order('sort_order')
      .order('id');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('식당 목록 조회 오류:', error);
    throw error;
  }
};

// 활성 식당만 조회
export const getActiveRestaurants = async () => {
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
    console.error('활성 식당 목록 조회 오류:', error);
    throw error;
  }
};

// 식당 추가
export const addRestaurant = async (data) => {
  const {
    name,
    building_name,
    price_lunch,
    price_dinner,
    has_dinner,
    webhook_url,
    webhook_type,
    use_all_days,
  } = data;

  // 현재 최대 sort_order 구하기
  const { data: maxOrderData } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const newOrder = (maxOrderData?.sort_order || 0) + 1;

  const { data: result, error } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .insert({
      name,
      building_name: building_name || '',
      price_lunch: price_lunch || '',
      price_dinner: price_dinner || '',
      has_dinner: has_dinner !== undefined ? has_dinner : true,
      webhook_url: webhook_url || null,
      webhook_type: webhook_type || null,
      use_all_days: use_all_days !== undefined ? use_all_days : true,
      sort_order: newOrder
    })
    .select()
    .single();

  if (error) throw error;

  return result;
};

// 식당 수정
export const updateRestaurant = async (id, data) => {
  const updates = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.building_name !== undefined) updates.building_name = data.building_name || '';
  if (data.price_lunch !== undefined) updates.price_lunch = data.price_lunch;
  if (data.price_dinner !== undefined) updates.price_dinner = data.price_dinner;
  if (data.has_dinner !== undefined) updates.has_dinner = data.has_dinner;
  if (data.is_active !== undefined) updates.is_active = data.is_active;
  if (data.sort_order !== undefined) updates.sort_order = data.sort_order;
  if (data.webhook_url !== undefined) updates.webhook_url = data.webhook_url || null;
  if (data.webhook_type !== undefined) updates.webhook_type = data.webhook_type || null;
  if (data.use_all_days !== undefined) updates.use_all_days = data.use_all_days;

  const { data: result, error } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;

  return { changes: result?.length || 0 };
};

// 식당 삭제
export const deleteRestaurant = async (id) => {
  const { error } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return { changes: 1 };
};

// 식당 단일 조회
export const getRestaurantById = async (id) => {
  const { data, error } = await supabase
    .from('centumbob_cafeteria_restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
};

// 식당 순서 일괄 업데이트
export const updateRestaurantOrders = async (orders) => {
  const promises = orders.map(item =>
    supabase
      .from('centumbob_cafeteria_restaurants')
      .update({
        sort_order: item.sort_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
  );

  await Promise.all(promises);

  return { success: true };
};

// ==================== 날짜 범위 관리 CRUD ====================

// 모든 날짜 범위 조회
export const getAllDateRanges = async () => {
  try {
    const { data, error } = await supabase
      .from('centumbob_date_ranges')
      .select('*')
      .order('year', { ascending: false })
      .order('week', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('날짜 범위 목록 조회 오류:', error);
    throw error;
  }
};

// 활성 날짜 범위만 조회
export const getActiveDateRanges = async () => {
  try {
    const { data, error } = await supabase
      .from('centumbob_date_ranges')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('week', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('활성 날짜 범위 목록 조회 오류:', error);
    throw error;
  }
};

// 날짜 범위 추가
export const addDateRange = async (data) => {
  const { date_range, year, week } = data;

  const { data: result, error } = await supabase
    .from('centumbob_date_ranges')
    .insert({
      date_range,
      year,
      week,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  return result;
};

// 날짜 범위 수정
export const updateDateRange = async (id, data) => {
  const { date_range, year, week, is_active } = data;

  // is_active를 true로 설정하는 경우, 다른 모든 날짜 범위를 비활성화
  if (is_active === true || is_active === 1) {
    await supabase
      .from('centumbob_date_ranges')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .neq('id', id);
  }

  const updates = { updated_at: new Date().toISOString() };

  if (date_range !== undefined) updates.date_range = date_range;
  if (year !== undefined) updates.year = year;
  if (week !== undefined) updates.week = week;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data: result, error } = await supabase
    .from('centumbob_date_ranges')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;

  return { changes: result?.length || 0 };
};

// 날짜 범위 삭제
export const deleteDateRange = async (id) => {
  const { error } = await supabase
    .from('centumbob_date_ranges')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return { changes: 1 };
};

// 날짜 범위 단일 조회
export const getDateRangeById = async (id) => {
  const { data, error } = await supabase
    .from('centumbob_date_ranges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
};

export default supabase;
