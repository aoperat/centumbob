/**
 * Legacy 이미지를 Supabase Storage로 마이그레이션
 *
 * 실행 방법:
 * node migrate-images-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  uploadImage as uploadToStorage,
  generateStorageFileName
} from './utils/supabaseStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 마이그레이션 통계
const stats = {
  total: 0,
  success: 0,
  skipped: 0,
  failed: 0,
  errors: []
};

/**
 * 이미지 경로가 legacy 로컬 경로인지 확인
 */
function isLegacyPath(imagePath) {
  if (!imagePath) return false;
  return imagePath.startsWith('uploads/') || imagePath.startsWith('uploads\\');
}

/**
 * Legacy 이미지를 Supabase Storage로 업로드
 */
async function migrateImage(localPath, restaurantId, dateRange) {
  try {
    const fullPath = path.join(__dirname, localPath);

    // 파일 존재 확인
    if (!fs.existsSync(fullPath)) {
      console.log(`  ❌ 파일 없음: ${localPath}`);
      return null;
    }

    // 파일 읽기
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath) || '.jpg';

    // Storage 파일명 생성
    const storageFileName = generateStorageFileName(restaurantId, dateRange, ext);

    // MIME type 결정 (jpg -> jpeg 변환)
    let mimeType = `image/${ext.slice(1)}`;
    if (mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }

    // Supabase Storage에 업로드
    const { storagePath } = await uploadToStorage(buffer, storageFileName, mimeType);

    console.log(`  ✅ 업로드 완료: ${storageFileName}`);
    return storagePath;

  } catch (error) {
    console.error(`  ❌ 업로드 실패: ${error.message}`);
    return null;
  }
}

/**
 * 메뉴 데이터의 이미지 경로 마이그레이션
 */
async function migrateMenuData(menuData) {
  console.log(`\n처리 중: ${menuData.restaurant_name} (${menuData.date_range})`);
  console.log('─'.repeat(70));

  let updated = false;
  let newImagePath = menuData.image_path;
  let newImagePaths = menuData.image_paths;

  // image_path 마이그레이션 (전체요일용)
  if (menuData.image_path && isLegacyPath(menuData.image_path)) {
    console.log(`  전체요일 이미지 마이그레이션: ${menuData.image_path}`);
    stats.total++;

    const storagePath = await migrateImage(
      menuData.image_path,
      menuData.restaurant_id,
      menuData.date_range
    );

    if (storagePath) {
      newImagePath = storagePath;
      updated = true;
      stats.success++;
    } else {
      stats.failed++;
      stats.errors.push({
        restaurant: menuData.restaurant_name,
        dateRange: menuData.date_range,
        path: menuData.image_path
      });
    }
  } else if (menuData.image_path) {
    console.log(`  전체요일 이미지 (이미 Supabase): ${menuData.image_path}`);
    stats.skipped++;
  }

  // image_paths 마이그레이션 (개별요일용)
  if (menuData.image_paths) {
    let imagePaths = menuData.image_paths;

    // JSON 문자열이면 파싱
    if (typeof imagePaths === 'string') {
      try {
        imagePaths = JSON.parse(imagePaths);
      } catch (e) {
        console.log(`  ❌ image_paths JSON 파싱 실패`);
        return;
      }
    }

    const days = ['월', '화', '수', '목', '금'];
    const migratedPaths = {};

    for (const day of days) {
      if (imagePaths[day]) {
        if (isLegacyPath(imagePaths[day])) {
          console.log(`  ${day}요일 이미지 마이그레이션: ${imagePaths[day]}`);
          stats.total++;

          const storagePath = await migrateImage(
            imagePaths[day],
            menuData.restaurant_id,
            menuData.date_range
          );

          if (storagePath) {
            migratedPaths[day] = storagePath;
            updated = true;
            stats.success++;
          } else {
            migratedPaths[day] = imagePaths[day]; // 실패 시 기존 경로 유지
            stats.failed++;
            stats.errors.push({
              restaurant: menuData.restaurant_name,
              dateRange: menuData.date_range,
              day: day,
              path: imagePaths[day]
            });
          }
        } else {
          console.log(`  ${day}요일 이미지 (이미 Supabase): ${imagePaths[day]}`);
          migratedPaths[day] = imagePaths[day];
          stats.skipped++;
        }
      }
    }

    if (Object.keys(migratedPaths).length > 0) {
      newImagePaths = migratedPaths;
    }
  }

  // DB 업데이트
  if (updated) {
    try {
      const { error } = await supabase
        .from('centumbob_menu_data')
        .update({
          image_path: newImagePath,
          image_paths: newImagePaths,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_id', menuData.restaurant_id)
        .eq('date_range', menuData.date_range);

      if (error) {
        console.error(`  ❌ DB 업데이트 실패:`, error.message);
      } else {
        console.log(`  ✅ DB 업데이트 완료`);
      }
    } catch (error) {
      console.error(`  ❌ DB 업데이트 오류:`, error.message);
    }
  } else {
    console.log(`  ℹ️  마이그레이션할 legacy 이미지 없음`);
  }
}

/**
 * 모든 메뉴 데이터 마이그레이션
 */
async function migrateAll() {
  console.log('=== Legacy 이미지 마이그레이션 시작 ===\n');

  try {
    // 모든 메뉴 데이터 조회
    const { data: menuDataList, error } = await supabase
      .from('centumbob_menu_data')
      .select('*')
      .order('restaurant_id')
      .order('date_range');

    if (error) {
      throw error;
    }

    console.log(`총 ${menuDataList.length}개의 메뉴 데이터 발견\n`);

    // 각 메뉴 데이터 처리
    for (const menuData of menuDataList) {
      await migrateMenuData(menuData);
    }

    // 통계 출력
    console.log('\n\n=== 마이그레이션 완료 ===');
    console.log(`총 처리: ${stats.total}개`);
    console.log(`✅ 성공: ${stats.success}개`);
    console.log(`⏭️  건너뜀 (이미 Supabase): ${stats.skipped}개`);
    console.log(`❌ 실패: ${stats.failed}개`);

    if (stats.errors.length > 0) {
      console.log('\n실패한 이미지 목록:');
      stats.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.restaurant} (${err.dateRange})${err.day ? ` - ${err.day}요일` : ''}`);
        console.log(`     경로: ${err.path}`);
      });
    }

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
  }
}

// 실행
migrateAll();
