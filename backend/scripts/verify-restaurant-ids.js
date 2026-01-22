import db from '../database.js';

console.log('=== Restaurant ID 마이그레이션 검증 ===\n');

// 1. restaurant_id가 NULL인 menu_data 레코드 확인
const nullIds = db.prepare(`
  SELECT id, restaurant_name, date_range
  FROM menu_data
  WHERE restaurant_id IS NULL
`).all();

if (nullIds.length > 0) {
  console.log(`⚠️  restaurant_id가 NULL인 레코드: ${nullIds.length}개`);
  nullIds.forEach(row => {
    console.log(`   - ID ${row.id}: ${row.restaurant_name} (${row.date_range})`);
  });
} else {
  console.log('✓ 모든 menu_data 레코드에 restaurant_id가 설정되어 있습니다.');
}

// 2. restaurants 테이블에 없는 restaurant_id 확인
const orphanedData = db.prepare(`
  SELECT md.id, md.restaurant_id, md.restaurant_name
  FROM menu_data md
  LEFT JOIN restaurants r ON md.restaurant_id = r.id
  WHERE md.restaurant_id IS NOT NULL AND r.id IS NULL
`).all();

if (orphanedData.length > 0) {
  console.log(`\n⚠️  참조 무결성 오류: ${orphanedData.length}개`);
  orphanedData.forEach(row => {
    console.log(`   - menu_data ID ${row.id}: restaurant_id=${row.restaurant_id}가 restaurants 테이블에 없음`);
  });
} else {
  console.log('\n✓ 모든 restaurant_id가 유효합니다.');
}

// 3. 통계
const stats = db.prepare(`
  SELECT
    COUNT(*) as total_menu_data,
    COUNT(restaurant_id) as with_id,
    COUNT(*) - COUNT(restaurant_id) as without_id
  FROM menu_data
`).get();

console.log(`\n=== 통계 ===`);
console.log(`총 menu_data 레코드: ${stats.total_menu_data}`);
console.log(`restaurant_id 있음: ${stats.with_id}`);
console.log(`restaurant_id 없음: ${stats.without_id}`);

// 4. UNIQUE 제약 확인
const constraintCheck = db.prepare(`
  SELECT sql FROM sqlite_master
  WHERE type='table' AND name='menu_data'
`).get();

console.log(`\n=== 현재 테이블 스키마 ===`);
if (constraintCheck) {
  if (constraintCheck.sql.includes('UNIQUE(restaurant_name, date_range)')) {
    console.log('⚠️  현재 UNIQUE 제약: (restaurant_name, date_range)');
  } else if (constraintCheck.sql.includes('UNIQUE(restaurant_id, date_range)')) {
    console.log('✓ 현재 UNIQUE 제약: (restaurant_id, date_range)');
  } else {
    console.log('ℹ️  UNIQUE 제약을 찾을 수 없습니다.');
  }
}

process.exit(0);
