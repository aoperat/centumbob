import db from '../database.js';

console.log('테스트 데이터 정리 중...');

try {
  // 테스트 식당 관련 메뉴 데이터 삭제
  const deleteMenuData = db.prepare(`
    DELETE FROM menu_data WHERE restaurant_name LIKE ?
  `);
  const result1 = deleteMenuData.run('%테스트식당%');
  console.log(`메뉴 데이터 삭제: ${result1.changes}개`);

  // 테스트 식당 삭제
  const deleteRestaurants = db.prepare(`
    DELETE FROM restaurants WHERE name LIKE ?
  `);
  const result2 = deleteRestaurants.run('%테스트식당%');
  console.log(`식당 삭제: ${result2.changes}개`);

  console.log('✓ 테스트 데이터 정리 완료');
} catch (error) {
  console.error('정리 중 오류:', error);
}
