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
const db = new Database(dbPath);

// 테이블 생성
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
`);

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
  const stmt = db.prepare(`
    SELECT * FROM menu_data 
    WHERE restaurant_name = ? AND date_range = ?
  `);

  const row = stmt.get(restaurant_name, date_range);
  
  if (!row) return null;

  return {
    ...row,
    menus: JSON.parse(row.menus)
  };
};

// 모든 데이터 조회
export const getAllMenuData = () => {
  const stmt = db.prepare(`
    SELECT * FROM menu_data 
    ORDER BY restaurant_name, date_range
  `);

  const rows = stmt.all();
  
  return rows.map(row => ({
    ...row,
    menus: JSON.parse(row.menus)
  }));
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

export default db;

