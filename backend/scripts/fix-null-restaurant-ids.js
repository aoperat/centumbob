import db from '../database.js';

console.log('=== NULL restaurant_id 수정 ===\n');

// 1. NULL restaurant_id를 가진 레코드 찾기
const nullRecords = db.prepare(`
  SELECT id, restaurant_name, date_range
  FROM menu_data
  WHERE restaurant_id IS NULL
`).all();

if (nullRecords.length === 0) {
  console.log('✓ 수정할 레코드가 없습니다.');
  process.exit(0);
}

console.log(`수정할 레코드: ${nullRecords.length}개\n`);

// 2. 각 레코드의 restaurant_name으로 restaurant_id 찾아서 업데이트
const updateStmt = db.prepare(`
  UPDATE menu_data
  SET restaurant_id = ?
  WHERE id = ?
`);

let successCount = 0;
let failCount = 0;

for (const record of nullRecords) {
  // restaurant_name으로 restaurant 찾기
  const restaurant = db.prepare(`
    SELECT id FROM restaurants WHERE name = ?
  `).get(record.restaurant_name);

  if (restaurant) {
    updateStmt.run(restaurant.id, record.id);
    console.log(`✓ ID ${record.id}: "${record.restaurant_name}" → restaurant_id=${restaurant.id}`);
    successCount++;
  } else {
    console.log(`✗ ID ${record.id}: "${record.restaurant_name}" - 식당을 찾을 수 없음`);
    failCount++;
  }
}

console.log(`\n=== 결과 ===`);
console.log(`성공: ${successCount}개`);
console.log(`실패: ${failCount}개`);

process.exit(failCount > 0 ? 1 : 0);
