import db from '../database.js';
import { saveMenuData, getMenuData, getAllRestaurants } from '../database.js';

console.log('=== 식당 이름 변경 시나리오 테스트 ===\n');

try {
  // 1. 테스트 식당 추가
  console.log('1. 테스트 식당 추가 중...');
  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants (name, building_name, price_lunch, price_dinner, has_dinner, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insertRestaurant.run('테스트식당A', '테스트빌딩', '5000원', '6000원', 1, 999);
  const restaurantId = result.lastInsertRowid;
  console.log(`   ✓ 식당 추가 완료: ID=${restaurantId}, name="테스트식당A"`);

  // 2. 메뉴 데이터 저장
  console.log('\n2. 메뉴 데이터 저장 중...');
  const menus = {
    월: { lunch: ['김치찌개', '밥', '반찬'], dinner: ['제육볶음', '밥', '국'] },
    화: { lunch: ['된장찌개', '밥', '반찬'], dinner: ['불고기', '밥', '국'] },
  };

  saveMenuData({
    restaurant_id: restaurantId,
    restaurant_name: '테스트식당A',
    date_range: '테스트 날짜',
    menus: menus,
  });
  console.log('   ✓ 메뉴 데이터 저장 완료');

  // 3. restaurant_id로 데이터 조회 테스트
  console.log('\n3. restaurant_id로 데이터 조회 테스트...');
  const data1 = getMenuData(restaurantId, '테스트 날짜');
  if (data1 && data1.menus.월.lunch[0] === '김치찌개') {
    console.log('   ✓ restaurant_id로 조회 성공:', data1.restaurant_name);
  } else {
    console.log('   ✗ restaurant_id로 조회 실패');
    process.exit(1);
  }

  // 4. 식당 이름 변경
  console.log('\n4. 식당 이름 변경 중...');
  const updateRestaurant = db.prepare(`
    UPDATE restaurants SET name = ? WHERE id = ?
  `);
  updateRestaurant.run('테스트식당B', restaurantId);
  console.log('   ✓ 식당 이름 변경 완료: "테스트식당A" → "테스트식당B"');

  // 5. 이름 변경 후 restaurant_id로 조회 테스트
  console.log('\n5. 이름 변경 후 restaurant_id로 조회 테스트...');
  const data2 = getMenuData(restaurantId, '테스트 날짜');
  if (data2 && data2.menus.월.lunch[0] === '김치찌개') {
    console.log('   ✓ 이름 변경 후에도 restaurant_id로 조회 성공!');
    console.log(`   ✓ 조회된 데이터의 restaurant_name: "${data2.restaurant_name}"`);
  } else {
    console.log('   ✗ 이름 변경 후 조회 실패');
    process.exit(1);
  }

  // 6. 새 이름으로도 조회 테스트 (restaurant_name으로 조회)
  console.log('\n6. 새 식당 이름으로 조회 테스트...');
  const data3 = getMenuData('테스트식당B', '테스트 날짜');
  if (data3 && data3.menus.월.lunch[0] === '김치찌개') {
    console.log('   ✓ 새 이름으로도 조회 성공!');
  } else {
    console.log('   ✗ 새 이름으로 조회 실패');
    process.exit(1);
  }

  // 7. 정리 (테스트 데이터 삭제)
  console.log('\n7. 테스트 데이터 정리 중...');
  db.prepare('DELETE FROM menu_data WHERE restaurant_id = ?').run(restaurantId);
  db.prepare('DELETE FROM restaurants WHERE id = ?').run(restaurantId);
  console.log('   ✓ 테스트 데이터 삭제 완료');

  console.log('\n=== ✓ 모든 테스트 통과! ===');
  console.log('식당 이름이 변경되어도 restaurant_id 기반 조회가 정상 작동합니다.');

} catch (error) {
  console.error('\n✗ 테스트 실패:', error);

  // 에러 발생 시에도 정리
  try {
    const restaurants = getAllRestaurants();
    const testRestaurant = restaurants.find(r => r.name.includes('테스트식당'));
    if (testRestaurant) {
      db.prepare('DELETE FROM menu_data WHERE restaurant_id = ?').run(testRestaurant.id);
      db.prepare('DELETE FROM restaurants WHERE id = ?').run(testRestaurant.id);
      console.log('테스트 데이터 정리 완료');
    }
  } catch (cleanupError) {
    console.error('정리 중 오류:', cleanupError);
  }

  process.exit(1);
}

process.exit(0);
