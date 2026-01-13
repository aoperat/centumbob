import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, "db");
const dbPath = path.join(dbDir, "menu.db");

// db 디렉토리가 없으면 생성
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 데이터베이스 연결
let db;
try {
  console.log("데이터베이스 경로:", dbPath);
  db = new Database(dbPath);
  console.log("데이터베이스 연결 성공");
} catch (dbError) {
  console.error("데이터베이스 연결 실패:", dbError);
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

    CREATE TABLE IF NOT EXISTS date_ranges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_range TEXT NOT NULL UNIQUE,
      year INTEGER NOT NULL,
      week INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_date_ranges_active ON date_ranges(is_active, year, week);
  `);

  // 마이그레이션: has_dinner 컬럼 확인 및 추가
  try {
    const tableInfo = db.pragma("table_info(restaurants)");
    const hasDinnerColumn = tableInfo.find((col) => col.name === "has_dinner");
    if (!hasDinnerColumn) {
      console.log("restaurants 테이블에 has_dinner 컬럼 추가 중...");
      db.exec(
        "ALTER TABLE restaurants ADD COLUMN has_dinner INTEGER DEFAULT 1"
      );
    }
  } catch (migrationError) {
    console.error("마이그레이션 오류:", migrationError);
  }

  // 마이그레이션: webhook_url 컬럼 확인 및 추가
  try {
    const tableInfo = db.pragma("table_info(restaurants)");
    const hasWebhookUrlColumn = tableInfo.find(
      (col) => col.name === "webhook_url"
    );
    if (!hasWebhookUrlColumn) {
      console.log("restaurants 테이블에 webhook_url 컬럼 추가 중...");
      db.exec(
        "ALTER TABLE restaurants ADD COLUMN webhook_url TEXT DEFAULT NULL"
      );
    }
  } catch (migrationError) {
    console.error("webhook_url 마이그레이션 오류:", migrationError);
  }

  // 마이그레이션: use_all_days 컬럼 확인 및 추가
  try {
    const tableInfo = db.pragma("table_info(restaurants)");
    const hasUseAllDaysColumn = tableInfo.find(
      (col) => col.name === "use_all_days"
    );
    if (!hasUseAllDaysColumn) {
      console.log("restaurants 테이블에 use_all_days 컬럼 추가 중...");
      db.exec(
        "ALTER TABLE restaurants ADD COLUMN use_all_days INTEGER DEFAULT 1"
      );
    }
  } catch (migrationError) {
    console.error("use_all_days 마이그레이션 오류:", migrationError);
  }

  // 마이그레이션: webhook_type 컬럼 확인 및 추가 (image, json, null)
  try {
    const tableInfo2 = db.pragma("table_info(restaurants)");
    const hasWebhookTypeColumn = tableInfo2.find(
      (col) => col.name === "webhook_type"
    );
    if (!hasWebhookTypeColumn) {
      console.log("restaurants 테이블에 webhook_type 컬럼 추가 중...");
      db.exec(
        "ALTER TABLE restaurants ADD COLUMN webhook_type TEXT DEFAULT NULL"
      );
    }
  } catch (migrationError) {
    console.error("webhook_type 마이그레이션 오류:", migrationError);
  }

  // 마이그레이션: menu_data 테이블에 image_paths 컬럼 확인 및 추가
  try {
    const menuDataTableInfo = db.pragma("table_info(menu_data)");
    const hasImagePathsColumn = menuDataTableInfo.find(
      (col) => col.name === "image_paths"
    );
    if (!hasImagePathsColumn) {
      console.log("menu_data 테이블에 image_paths 컬럼 추가 중...");
      db.exec("ALTER TABLE menu_data ADD COLUMN image_paths TEXT DEFAULT NULL");

      // 기존 image_path가 있으면 image_paths로 변환 (모든 요일에 동일 이미지 적용)
      try {
        const existingData = db
          .prepare(
            "SELECT id, image_path FROM menu_data WHERE image_path IS NOT NULL AND image_path != ''"
          )
          .all();
        if (existingData.length > 0) {
          console.log(
            `${existingData.length}개 레코드의 image_path를 image_paths로 변환 중...`
          );
          const updateStmt = db.prepare(
            "UPDATE menu_data SET image_paths = ? WHERE id = ?"
          );
          existingData.forEach((row) => {
            // 모든 요일에 동일 이미지 적용
            const imagePaths = JSON.stringify({
              월: row.image_path,
              화: row.image_path,
              수: row.image_path,
              목: row.image_path,
              금: row.image_path,
            });
            updateStmt.run(imagePaths, row.id);
          });
          console.log("image_path 변환 완료");
        }
      } catch (convertError) {
        console.error("image_path 변환 오류:", convertError);
      }
    }
  } catch (migrationError) {
    console.error("image_paths 마이그레이션 오류:", migrationError);
  }

  // 마이그레이션: menu_data 테이블에 excluded_menu_items 컬럼 확인 및 추가
  try {
    const menuDataTableInfo = db.pragma("table_info(menu_data)");
    const hasExcludedMenuItemsColumn = menuDataTableInfo.find(
      (col) => col.name === "excluded_menu_items"
    );
    if (!hasExcludedMenuItemsColumn) {
      console.log("menu_data 테이블에 excluded_menu_items 컬럼 추가 중...");
      db.exec(
        "ALTER TABLE menu_data ADD COLUMN excluded_menu_items TEXT DEFAULT NULL"
      );
      console.log("excluded_menu_items 컬럼 추가 완료");
    }
  } catch (migrationError) {
    console.error("excluded_menu_items 마이그레이션 오류:", migrationError);
  }

  // 마이그레이션: menu_data 테이블에 restaurant_id 컬럼 확인 및 추가
  try {
    const menuDataTableInfo = db.pragma("table_info(menu_data)");
    const hasRestaurantIdColumn = menuDataTableInfo.find(
      (col) => col.name === "restaurant_id"
    );
    if (!hasRestaurantIdColumn) {
      console.log("menu_data 테이블에 restaurant_id 컬럼 추가 중...");
      db.exec(
        "ALTER TABLE menu_data ADD COLUMN restaurant_id INTEGER DEFAULT NULL"
      );

      // 기존 데이터 마이그레이션: restaurant_name으로 restaurant_id 찾아서 설정
      try {
        const existingData = db
          .prepare(
            "SELECT id, restaurant_name FROM menu_data WHERE restaurant_id IS NULL"
          )
          .all();
        if (existingData.length > 0) {
          console.log(
            `${existingData.length}개 레코드의 restaurant_id 마이그레이션 중...`
          );
          const updateStmt = db.prepare(
            "UPDATE menu_data SET restaurant_id = ? WHERE id = ?"
          );
          const getRestaurantIdStmt = db.prepare(
            "SELECT id FROM restaurants WHERE name = ?"
          );

          let migratedCount = 0;
          existingData.forEach((row) => {
            const restaurant = getRestaurantIdStmt.get(row.restaurant_name);
            if (restaurant) {
              updateStmt.run(restaurant.id, row.id);
              migratedCount++;
            } else {
              console.warn(
                `식당을 찾을 수 없음: ${row.restaurant_name} (menu_data id: ${row.id})`
              );
            }
          });
          console.log(
            `restaurant_id 마이그레이션 완료: ${migratedCount}개 레코드 업데이트됨`
          );
        }
      } catch (migrateError) {
        console.error("restaurant_id 마이그레이션 오류:", migrateError);
      }

      // 인덱스 추가
      try {
        db.exec(
          "CREATE INDEX IF NOT EXISTS idx_menu_data_restaurant_id ON menu_data(restaurant_id)"
        );
        console.log("restaurant_id 인덱스 추가 완료");
      } catch (indexError) {
        console.error("restaurant_id 인덱스 추가 오류:", indexError);
      }
    }
  } catch (migrationError) {
    console.error("restaurant_id 마이그레이션 오류:", migrationError);
  }

  console.log("데이터베이스 테이블 초기화 완료");
} catch (tableError) {
  console.error("테이블 생성 실패:", tableError);
  throw tableError;
}

// 데이터 삽입 또는 업데이트
export const saveMenuData = (data) => {
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
    const restaurant = db
      .prepare("SELECT id, name FROM restaurants WHERE name = ?")
      .get(restaurant_name);
    if (restaurant) {
      finalRestaurantId = restaurant.id;
      finalRestaurantName = restaurant.name;
    }
  } else if (finalRestaurantId && !restaurant_name) {
    // restaurant_id만 있으면 restaurant_name 찾기
    const restaurant = db
      .prepare("SELECT id, name FROM restaurants WHERE id = ?")
      .get(finalRestaurantId);
    if (restaurant) {
      finalRestaurantName = restaurant.name;
    }
  }

  // image_paths를 JSON 문자열로 변환
  let imagePathsJson = null;
  if (image_paths) {
    if (typeof image_paths === "string") {
      imagePathsJson = image_paths;
    } else {
      imagePathsJson = JSON.stringify(image_paths);
    }
  }

  // excluded_menu_items를 JSON 문자열로 변환
  let excludedMenuItemsJson = null;
  if (excluded_menu_items) {
    if (typeof excluded_menu_items === "string") {
      excludedMenuItemsJson = excluded_menu_items;
    } else if (Array.isArray(excluded_menu_items)) {
      excludedMenuItemsJson = JSON.stringify(excluded_menu_items);
    }
  }

  const stmt = db.prepare(`
    INSERT INTO menu_data (restaurant_name, restaurant_id, date_range, price_lunch, price_dinner, menus, image_path, image_paths, excluded_menu_items, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(restaurant_name, date_range) 
    DO UPDATE SET
      restaurant_id = excluded.restaurant_id,
      price_lunch = excluded.price_lunch,
      price_dinner = excluded.price_dinner,
      menus = excluded.menus,
      image_path = excluded.image_path,
      image_paths = excluded.image_paths,
      excluded_menu_items = excluded.excluded_menu_items,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = stmt.run(
    finalRestaurantName,
    finalRestaurantId || null,
    date_range,
    price_lunch || null,
    price_dinner || null,
    JSON.stringify(menus),
    image_path || null,
    imagePathsJson || null,
    excludedMenuItemsJson || null
  );

  return result;
};

// 특정 식당/날짜 데이터 조회 (restaurant_name 또는 restaurant_id로 조회 가능)
export const getMenuData = (restaurant_identifier, date_range) => {
  try {
    let stmt;
    let params;

    // restaurant_id인지 restaurant_name인지 판단
    if (typeof restaurant_identifier === "number" || /^\d+$/.test(String(restaurant_identifier))) {
      // 숫자면 restaurant_id로 조회
      stmt = db.prepare(`
        SELECT * FROM menu_data 
        WHERE restaurant_id = ? AND date_range = ?
      `);
      params = [parseInt(restaurant_identifier, 10), date_range];
    } else {
      // 문자열이면 restaurant_name으로 조회
      stmt = db.prepare(`
        SELECT * FROM menu_data 
        WHERE restaurant_name = ? AND date_range = ?
      `);
      params = [restaurant_identifier, date_range];
    }

    const row = stmt.get(...params);

    if (!row) return null;

    // menus JSON 파싱 (에러 처리)
    let menus;
    try {
      menus = JSON.parse(row.menus);
    } catch (parseError) {
      console.error(
        "메뉴 JSON 파싱 오류:",
        parseError,
        "원본 데이터:",
        row.menus
      );
      // 파싱 실패 시 빈 객체 반환
      menus = {};
    }

    // image_paths JSON 파싱 (에러 처리)
    let imagePaths = null;
    if (row.image_paths) {
      try {
        imagePaths = JSON.parse(row.image_paths);
      } catch (parseError) {
        console.error(
          "image_paths JSON 파싱 오류:",
          parseError,
          "원본 데이터:",
          row.image_paths
        );
        // 파싱 실패 시 null 유지
        imagePaths = null;
      }
    }

    // excluded_menu_items JSON 파싱 (에러 처리)
    let excludedMenuItems = null;
    if (row.excluded_menu_items) {
      try {
        excludedMenuItems = JSON.parse(row.excluded_menu_items);
      } catch (parseError) {
        console.error(
          "excluded_menu_items JSON 파싱 오류:",
          parseError,
          "원본 데이터:",
          row.excluded_menu_items
        );
        // 파싱 실패 시 null 유지
        excludedMenuItems = null;
      }
    }

    return {
      ...row,
      menus: menus,
      image_paths: imagePaths,
      excluded_menu_items: excludedMenuItems,
    };
  } catch (error) {
    console.error("데이터 조회 오류:", error);
    throw error;
  }
};

// 식당 ID로 메뉴 데이터 조회
export const getMenuDataByRestaurantId = (restaurant_id, date_range) => {
  return getMenuData(restaurant_id, date_range);
};

// 모든 데이터 조회
export const getAllMenuData = () => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM menu_data 
      ORDER BY restaurant_name, date_range
    `);

    const rows = stmt.all();

    return rows.map((row) => {
      // menus JSON 파싱 (에러 처리)
      let menus;
      try {
        menus = JSON.parse(row.menus);
      } catch (parseError) {
        console.error(
          "메뉴 JSON 파싱 오류:",
          parseError,
          "원본 데이터:",
          row.menus
        );
        // 파싱 실패 시 빈 객체 반환
        menus = {};
      }

      // image_paths JSON 파싱 (에러 처리)
      let imagePaths = null;
      if (row.image_paths) {
        try {
          imagePaths = JSON.parse(row.image_paths);
        } catch (parseError) {
          console.error(
            "image_paths JSON 파싱 오류:",
            parseError,
            "원본 데이터:",
            row.image_paths
          );
          imagePaths = null;
        }
      }

      // excluded_menu_items JSON 파싱 (에러 처리)
      let excludedMenuItems = null;
      if (row.excluded_menu_items) {
        try {
          excludedMenuItems = JSON.parse(row.excluded_menu_items);
        } catch (parseError) {
          console.error(
            "excluded_menu_items JSON 파싱 오류:",
            parseError,
            "원본 데이터:",
            row.excluded_menu_items
          );
          excludedMenuItems = null;
        }
      }

      return {
        ...row,
        menus: menus,
        image_paths: imagePaths,
        excluded_menu_items: excludedMenuItems,
      };
    });
  } catch (error) {
    console.error("모든 데이터 조회 오류:", error);
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

// 식당의 모든 데이터 삭제
export const deleteAllMenuDataByRestaurant = (restaurant_name) => {
  const stmt = db.prepare(`
    DELETE FROM menu_data 
    WHERE restaurant_name = ?
  `);

  return stmt.run(restaurant_name);
};

// ==================== 식당 관리 CRUD ====================

// 모든 식당 조회
export const getAllRestaurants = () => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM restaurants
      ORDER BY sort_order ASC, id ASC
    `);
    const results = stmt.all();
    // use_all_days 필드가 없으면 기본값 1로 설정 (하위 호환성)
    return results.map((row) => ({
      ...row,
      use_all_days: row.use_all_days === undefined ? 1 : row.use_all_days,
    }));
  } catch (error) {
    console.error("식당 목록 조회 오류:", error);
    throw error;
  }
};

// 활성 식당만 조회
export const getActiveRestaurants = () => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM restaurants
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `);
    const results = stmt.all();
    // use_all_days 필드가 없으면 기본값 1로 설정 (하위 호환성)
    return results.map((row) => ({
      ...row,
      use_all_days: row.use_all_days === undefined ? 1 : row.use_all_days,
    }));
  } catch (error) {
    console.error("활성 식당 목록 조회 오류:", error);
    throw error;
  }
};

// 식당 추가
export const addRestaurant = (data) => {
  const {
    name,
    price_lunch,
    price_dinner,
    has_dinner,
    webhook_url,
    webhook_type,
    use_all_days,
  } = data;

  // 현재 최대 sort_order 구하기
  const maxOrder = db
    .prepare("SELECT MAX(sort_order) as max_order FROM restaurants")
    .get();
  const newOrder = (maxOrder?.max_order || 0) + 1;

  const stmt = db.prepare(`
    INSERT INTO restaurants (name, price_lunch, price_dinner, has_dinner, webhook_url, webhook_type, use_all_days, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const hasDinnerVal = has_dinner === undefined ? 1 : has_dinner ? 1 : 0;
  const useAllDaysVal = use_all_days === undefined ? 1 : use_all_days ? 1 : 0;
  const result = stmt.run(
    name,
    price_lunch || "",
    price_dinner || "",
    hasDinnerVal,
    webhook_url || null,
    webhook_type || null,
    useAllDaysVal,
    newOrder
  );
  return {
    id: result.lastInsertRowid,
    name,
    price_lunch,
    price_dinner,
    has_dinner: hasDinnerVal,
    webhook_url: webhook_url || null,
    use_all_days: useAllDaysVal,
    sort_order: newOrder,
  };
};

// 식당 수정
export const updateRestaurant = (id, data) => {
  const {
    name,
    price_lunch,
    price_dinner,
    has_dinner,
    is_active,
    sort_order,
    webhook_url,
    webhook_type,
    use_all_days,
  } = data;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push("name = ?");
    params.push(name);
  }
  if (price_lunch !== undefined) {
    updates.push("price_lunch = ?");
    params.push(price_lunch);
  }
  if (price_dinner !== undefined) {
    updates.push("price_dinner = ?");
    params.push(price_dinner);
  }
  if (has_dinner !== undefined) {
    updates.push("has_dinner = ?");
    params.push(has_dinner ? 1 : 0);
  }
  if (is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }
  if (sort_order !== undefined) {
    updates.push("sort_order = ?");
    params.push(sort_order);
  }
  if (webhook_url !== undefined) {
    updates.push("webhook_url = ?");
    params.push(webhook_url || null);
  }
  if (webhook_type !== undefined) {
    updates.push("webhook_type = ?");
    params.push(webhook_type || null);
  }
  if (use_all_days !== undefined) {
    updates.push("use_all_days = ?");
    params.push(use_all_days ? 1 : 0);
  }

  if (updates.length === 0) {
    return { changes: 0 };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  const stmt = db.prepare(`
    UPDATE restaurants
    SET ${updates.join(", ")}
    WHERE id = ?
  `);

  return stmt.run(...params);
};

// 식당 삭제
export const deleteRestaurant = (id) => {
  const stmt = db.prepare("DELETE FROM restaurants WHERE id = ?");
  return stmt.run(id);
};

// 식당 단일 조회
export const getRestaurantById = (id) => {
  const stmt = db.prepare("SELECT * FROM restaurants WHERE id = ?");
  return stmt.get(id);
};

// 식당 순서 일괄 업데이트
export const updateRestaurantOrders = (orders) => {
  const stmt = db.prepare(
    "UPDATE restaurants SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  );

  const updateMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id);
    }
  });

  updateMany(orders);
  return { success: true };
};

// ==================== 날짜 범위 관리 CRUD ====================

// 모든 날짜 범위 조회
export const getAllDateRanges = () => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM date_ranges
      ORDER BY year DESC, week DESC
    `);
    return stmt.all();
  } catch (error) {
    console.error("날짜 범위 목록 조회 오류:", error);
    throw error;
  }
};

// 활성 날짜 범위만 조회
export const getActiveDateRanges = () => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM date_ranges
      WHERE is_active = 1
      ORDER BY year DESC, week DESC
    `);
    return stmt.all();
  } catch (error) {
    console.error("활성 날짜 범위 목록 조회 오류:", error);
    throw error;
  }
};

// 날짜 범위 추가
export const addDateRange = (data) => {
  const { date_range, year, week } = data;

  const stmt = db.prepare(`
    INSERT INTO date_ranges (date_range, year, week, is_active)
    VALUES (?, ?, ?, 1)
  `);

  const result = stmt.run(date_range, year, week);
  return {
    id: result.lastInsertRowid,
    date_range,
    year,
    week,
    is_active: 1,
  };
};

// 날짜 범위 수정
export const updateDateRange = (id, data) => {
  const { date_range, year, week, is_active } = data;

  // is_active를 1로 설정하는 경우, 다른 모든 날짜 범위를 비활성화 (단일 활성화 정책)
  if (is_active !== undefined && (is_active === 1 || is_active === true)) {
    const disableStmt = db.prepare(
      "UPDATE date_ranges SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id != ?"
    );
    disableStmt.run(id);
  }

  const updates = [];
  const params = [];

  if (date_range !== undefined) {
    updates.push("date_range = ?");
    params.push(date_range);
  }
  if (year !== undefined) {
    updates.push("year = ?");
    params.push(year);
  }
  if (week !== undefined) {
    updates.push("week = ?");
    params.push(week);
  }
  if (is_active !== undefined) {
    updates.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  if (updates.length === 0) {
    return { changes: 0 };
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  const stmt = db.prepare(`
    UPDATE date_ranges
    SET ${updates.join(", ")}
    WHERE id = ?
  `);

  return stmt.run(...params);
};

// 날짜 범위 삭제
export const deleteDateRange = (id) => {
  const stmt = db.prepare("DELETE FROM date_ranges WHERE id = ?");
  return stmt.run(id);
};

// 날짜 범위 단일 조회
export const getDateRangeById = (id) => {
  const stmt = db.prepare("SELECT * FROM date_ranges WHERE id = ?");
  return stmt.get(id);
};

export default db;
