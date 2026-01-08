import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'db');
const dbPath = path.join(dbDir, 'menu.db');

// db 디렉토리가 없으면 생성
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 데이터베이스 연결
let db;
try {
  console.log('데이터베이스 경로:', dbPath);
  db = new Database(dbPath);
  console.log('데이터베이스 연결 성공');
} catch (dbError) {
  console.error('데이터베이스 연결 실패:', dbError);
  throw dbError;
}

// 테이블 생성
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_name TEXT NOT NULL,
      date_range TEXT NOT NULL,
      price_lunch TEXT,
      price_dinner TEXT,
      menus TEXT NOT NULL,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(restaurant_name, date_range)
    );

    CREATE INDEX IF NOT EXISTS idx_restaurant_date ON menu_data(restaurant_name, date_range);

    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price_lunch TEXT DEFAULT '',
      price_dinner TEXT DEFAULT '',
      has_dinner INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active, sort_order);
  `);

  // 마이그레이션: has_dinner 컬럼 확인 및 추가
  try {
    const tableInfo = db.pragma('table_info(restaurants)');
    const hasDinnerColumn = tableInfo.find(col => col.name === 'has_dinner');
    if (!hasDinnerColumn) {
      console.log('restaurants 테이블에 has_dinner 컬럼 추가 중...');
      db.exec('ALTER TABLE restaurants ADD COLUMN has_dinner INTEGER DEFAULT 1');
    }
  } catch (migrationError) {
    console.error('마이그레이션 오류:', migrationError);
  }

  // 마이그레이션: webhook_url 컬럼 확인 및 추가
  try {
    const tableInfo = db.pragma('table_info(restaurants)');
    const hasWebhookUrlColumn = tableInfo.find(col => col.name === 'webhook_url');
    if (!hasWebhookUrlColumn) {
      console.log('restaurants 테이블에 webhook_url 컬럼 추가 중...');
      db.exec('ALTER TABLE restaurants ADD COLUMN webhook_url TEXT DEFAULT NULL');
    }
  } catch (migrationError) {
    console.error('webhook_url 마이그레이션 오류:', migrationError);
  }

  console.log('데이터베이스 테이블 초기화 완료');
} catch (tableError) {
  console.error('테이블 생성 실패:', tableError);
  throw tableError;
}

// 데이터 삽입 또는 업데이트
export const saveMenuData = (data) => {
  const { restaurant_name, date_range, price_lunch, price_dinner, menus, image_path } = data;
  
  const stmt = db.prepare(`
    INSERT INTO menu_data (restaurant_name, date_range, price_lunch, price_dinner, menus, image_path, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(restaurant_name, date_range) 
    DO UPDATE SET
      price_lunch = excluded.price_lunch,
      price_dinner = excluded.price_dinner,
      menus = excluded.menus,
      image_path = excluded.image_path,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = stmt.run(
    restaurant_name,
    date_range,
    price_lunch || null,
    price_dinner || null,
    JSON.stringify(menus),
    image_path || null
  );

  return result;
};

// 특정 식당/날짜 데이터 조회
export const getMenuData = (restaurant_name, date_range) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM menu_data 
      WHERE restaurant_name = ? AND date_range = ?
    `);

    const row = stmt.get(restaurant_name, date_range);
    
    if (!row) return null;

    // menus JSON 파싱 (에러 처리)
    let menus;
    try {
      menus = JSON.parse(row.menus);
    } catch (parseError) {
      console.error('메뉴 JSON 파싱 오류:', parseError, '원본 데이터:', row.menus);
      // 파싱 실패 시 빈 객체 반환
      menus = {};
    }

    return {
      ...row,
      menus: menus
    };
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    throw error;
  }
};

// 모든 데이터 조회
export const getAllMenuData = () => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM menu_data 
      ORDER BY restaurant_name, date_range
    `);

    const rows = stmt.all();
    
    return rows.map(row => {
      // menus JSON 파싱 (에러 처리)
      let menus;
      try {
        menus = JSON.parse(row.menus);
      } catch (parseError) {
        console.error('메뉴 JSON 파싱 오류:', parseError, '원본 데이터:', row.menus);
        // 파싱 실패 시 빈 객체 반환
        menus = {};
      }
      
      return {
        ...row,
        menus: menus
      };
    });
  } catch (error) {
    console.error('모든 데이터 조회 오류:', error);
    throw error;
  }
};

// 저장된 데이터 목록 조회 (식당명, 날짜만)
export const getMenuDataList = () => {
  const stmt = db.prepare(`
    SELECT restaurant_name, date_range, created_at, updated_at 
    FROM menu_data 
    ORDER BY restaurant_name, date_range
  `);

  return stmt.all();
};

// 데이터 삭제
export const deleteMenuData = (restaurant_name, date_range) => {
  const stmt = db.prepare(`
    DELETE FROM menu_data 
    WHERE restaurant_name = ? AND date_range = ?
  `);

  return stmt.run(restaurant_name, date_range);
};

// ==================== 식당 관리 CRUD ====================

// 모든 식당 조회
export const getAllRestaurants = () => {
  const stmt = db.prepare(`
    SELECT * FROM restaurants
    ORDER BY sort_order ASC, id ASC
  `);
  return stmt.all();
};

// 활성 식당만 조회
export const getActiveRestaurants = () => {
  const stmt = db.prepare(`
    SELECT * FROM restaurants
    WHERE is_active = 1
    ORDER BY sort_order ASC, id ASC
  `);
  return stmt.all();
};

// 식당 추가
export const addRestaurant = (data) => {
  const { name, price_lunch, price_dinner, has_dinner, webhook_url } = data;

  // 현재 최대 sort_order 구하기
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM restaurants').get();
  const newOrder = (maxOrder?.max_order || 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO restaurants (name, price_lunch, price_dinner, has_dinner, webhook_url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const hasDinnerVal = has_dinner === undefined ? 1 : (has_dinner ? 1 : 0);
  const result = stmt.run(name, price_lunch || '', price_dinner || '', hasDinnerVal, webhook_url || null, newOrder);
  return { id: result.lastInsertRowid, name, price_lunch, price_dinner, has_dinner: hasDinnerVal, webhook_url: webhook_url || null, sort_order: newOrder };
};

// 식당 수정
export const updateRestaurant = (id, data) => {
  const { name, price_lunch, price_dinner, has_dinner, is_active, sort_order, webhook_url } = data;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (price_lunch !== undefined) {
    updates.push('price_lunch = ?');
    params.push(price_lunch);
  }
  if (price_dinner !== undefined) {
    updates.push('price_dinner = ?');
    params.push(price_dinner);
  }
  if (has_dinner !== undefined) {
    updates.push('has_dinner = ?');
    params.push(has_dinner ? 1 : 0);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(sort_order);
  }
  if (webhook_url !== undefined) {
    updates.push('webhook_url = ?');
    params.push(webhook_url || null);
  }

  if (updates.length === 0) {
    return { changes: 0 };
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const stmt = db.prepare(`
    UPDATE restaurants
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  return stmt.run(...params);
};

// 식당 삭제
export const deleteRestaurant = (id) => {
  const stmt = db.prepare('DELETE FROM restaurants WHERE id = ?');
  return stmt.run(id);
};

// 식당 단일 조회
export const getRestaurantById = (id) => {
  const stmt = db.prepare('SELECT * FROM restaurants WHERE id = ?');
  return stmt.get(id);
};

// 식당 순서 일괄 업데이트
export const updateRestaurantOrders = (orders) => {
  const stmt = db.prepare('UPDATE restaurants SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

  const updateMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id);
    }
  });

  updateMany(orders);
  return { success: true };
};

export default db;

