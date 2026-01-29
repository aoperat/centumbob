import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testImagePaths() {
  console.log('=== DB 이미지 경로 확인 ===\n');

  try {
    // 활성 날짜 범위 조회
    const { data: activeDateRanges, error: dateError } = await supabase
      .from('centumbob_date_ranges')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('week', { ascending: false })
      .limit(1);

    if (dateError) throw dateError;

    if (!activeDateRanges || activeDateRanges.length === 0) {
      console.log('❌ 활성화된 날짜 범위가 없습니다.');
      return;
    }

    const activeDateRange = activeDateRanges[0].date_range;
    console.log('활성 날짜 범위:', activeDateRange);
    console.log('');

    // 활성 식당 목록 조회
    const { data: restaurants, error: restError } = await supabase
      .from('centumbob_cafeteria_restaurants')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .limit(5);

    if (restError) throw restError;

    console.log(`활성 식당: ${restaurants.length}개\n`);

    // 각 식당의 메뉴 데이터와 이미지 경로 확인
    for (const restaurant of restaurants) {
      const { data: menuData, error: menuError } = await supabase
        .from('centumbob_menu_data')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('date_range', activeDateRange)
        .single();

      console.log(`\n식당: ${restaurant.name} (ID: ${restaurant.id})`);
      console.log('─'.repeat(60));

      if (menuError) {
        if (menuError.code === 'PGRST116') {
          console.log('⚠️  메뉴 데이터 없음');
        } else {
          console.log('❌ 오류:', menuError.message);
        }
        continue;
      }

      if (!menuData) {
        console.log('⚠️  메뉴 데이터 없음');
        continue;
      }

      // image_path (전체요일용)
      if (menuData.image_path) {
        console.log('전체요일 이미지 경로 (image_path):');
        console.log('  ', menuData.image_path);

        const supabaseUrl = process.env.SUPABASE_URL;
        const fullUrl = `${supabaseUrl}/storage/v1/object/public/centumbob-menu-images/${menuData.image_path}`;
        console.log('  변환된 URL:', fullUrl);

        // URL 접근 테스트
        try {
          const response = await fetch(fullUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('  ✅ 접근 가능');
          } else {
            console.log(`  ❌ 접근 불가 (${response.status})`);
          }
        } catch (e) {
          console.log('  ❌ 접근 테스트 실패:', e.message);
        }
      }

      // image_paths (개별요일용)
      if (menuData.image_paths) {
        let imagePaths = menuData.image_paths;

        // JSON 문자열이면 파싱
        if (typeof imagePaths === 'string') {
          try {
            imagePaths = JSON.parse(imagePaths);
          } catch (e) {
            console.log('  ❌ image_paths JSON 파싱 실패:', e.message);
            continue;
          }
        }

        console.log('개별요일 이미지 경로 (image_paths):');
        const days = ['월', '화', '수', '목', '금'];
        for (const day of days) {
          if (imagePaths[day]) {
            console.log(`  ${day}요일:`, imagePaths[day]);

            const supabaseUrl = process.env.SUPABASE_URL;
            const fullUrl = `${supabaseUrl}/storage/v1/object/public/centumbob-menu-images/${imagePaths[day]}`;
            console.log(`    변환된 URL: ${fullUrl}`);

            // URL 접근 테스트
            try {
              const response = await fetch(fullUrl, { method: 'HEAD' });
              if (response.ok) {
                console.log('    ✅ 접근 가능');
              } else {
                console.log(`    ❌ 접근 불가 (${response.status})`);
              }
            } catch (e) {
              console.log('    ❌ 접근 테스트 실패:', e.message);
            }
          }
        }
      }

      if (!menuData.image_path && !menuData.image_paths) {
        console.log('⚠️  이미지 경로 없음');
      }
    }

    console.log('\n\n=== 테스트 완료 ===');

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

testImagePaths();
