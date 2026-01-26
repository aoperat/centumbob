/**
 * 기존 로컬 이미지를 Supabase Storage로 마이그레이션하는 일회성 스크립트
 *
 * 실행: node scripts/migrate-images-to-supabase.js
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, "..");

const BUCKET_NAME = "centumbob-menu-images";

const supabaseUrl = process.env.SUPABASE_URL || "https://vaqfjjkwpzrolebvbnbl.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// MIME 타입 결정
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "image/jpeg";
};

// Storage용 안전한 파일명 생성 (ASCII만 허용)
const generateStorageName = (restaurantId, dateRange, originalPath) => {
  const ext = path.extname(originalPath) || ".jpg";
  // 한글 및 특수문자 제거, 숫자와 점/하이픈만 유지
  const safeDateRange = dateRange.replace(/[^0-9.-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  // 원본 파일명에서 타임스탬프 추출 (있으면 재사용)
  const match = originalPath.match(/(\d{13})/);
  const timestamp = match ? match[1] : Date.now();
  return `${restaurantId}_${safeDateRange}_${timestamp}${ext}`;
};

// 이미지 업로드
const uploadToStorage = async (localPath, storageName) => {
  const absolutePath = path.join(backendDir, localPath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`  ⚠ 파일 없음: ${absolutePath}`);
    return null;
  }

  const buffer = fs.readFileSync(absolutePath);
  const contentType = getMimeType(localPath);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storageName, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`  ✗ 업로드 실패 (${storageName}):`, error.message);
    return null;
  }

  console.log(`  ✓ 업로드 완료: ${storageName}`);
  return storageName;
};

async function main() {
  console.log("=== 이미지 마이그레이션 시작 ===\n");

  // 1. DB에서 로컬 이미지 경로가 있는 레코드 조회
  const { data: records, error } = await supabase
    .from("centumbob_menu_data")
    .select("id, restaurant_id, date_range, image_path, image_paths")
    .or("image_path.neq.null,image_paths.neq.null");

  if (error) {
    console.error("DB 조회 실패:", error.message);
    process.exit(1);
  }

  console.log(`총 ${records.length}개 레코드 발견\n`);

  let uploadCount = 0;
  let skipCount = 0;
  let failCount = 0;

  // 중복 업로드 방지용 캐시 (같은 로컬 경로 → 같은 Storage 경로)
  const uploadCache = new Map();

  for (const record of records) {
    console.log(`[ID:${record.id}] restaurant_id=${record.restaurant_id}, date_range=${record.date_range}`);

    let newImagePath = record.image_path;
    let newImagePaths = record.image_paths ? { ...record.image_paths } : null;
    let changed = false;

    // image_path 처리 (전체요일 모드)
    if (record.image_path && record.image_path.startsWith("uploads/")) {
      if (uploadCache.has(record.image_path)) {
        newImagePath = uploadCache.get(record.image_path);
        changed = true;
        console.log(`  → image_path 캐시 사용: ${newImagePath}`);
      } else {
        const storageName = generateStorageName(
          record.restaurant_id,
          record.date_range,
          record.image_path
        );
        const result = await uploadToStorage(record.image_path, storageName);
        if (result) {
          uploadCache.set(record.image_path, result);
          newImagePath = result;
          changed = true;
          uploadCount++;
        } else {
          failCount++;
        }
      }
    } else if (record.image_path) {
      console.log(`  → image_path 이미 마이그레이션됨 (skip)`);
      skipCount++;
    }

    // image_paths 처리 (개별요일 모드)
    if (record.image_paths) {
      for (const [day, dayPath] of Object.entries(record.image_paths)) {
        if (dayPath && dayPath.startsWith("uploads/")) {
          if (uploadCache.has(dayPath)) {
            newImagePaths[day] = uploadCache.get(dayPath);
            changed = true;
            console.log(`  → ${day}요일 캐시 사용: ${newImagePaths[day]}`);
          } else {
            const storageName = generateStorageName(
              record.restaurant_id,
              record.date_range,
              dayPath
            );
            const result = await uploadToStorage(dayPath, storageName);
            if (result) {
              uploadCache.set(dayPath, result);
              newImagePaths[day] = result;
              changed = true;
              uploadCount++;
            } else {
              failCount++;
            }
          }
        } else if (dayPath) {
          skipCount++;
        }
      }
    }

    // DB 업데이트
    if (changed) {
      const updateData = {};
      if (newImagePath !== record.image_path) {
        updateData.image_path = newImagePath;
      }
      if (newImagePaths && JSON.stringify(newImagePaths) !== JSON.stringify(record.image_paths)) {
        updateData.image_paths = newImagePaths;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("centumbob_menu_data")
          .update(updateData)
          .eq("id", record.id);

        if (updateError) {
          console.error(`  ✗ DB 업데이트 실패 (ID:${record.id}):`, updateError.message);
        } else {
          console.log(`  ✓ DB 업데이트 완료 (ID:${record.id})`);
        }
      }
    }

    console.log("");
  }

  console.log("=== 마이그레이션 완료 ===");
  console.log(`업로드: ${uploadCount}건 | 스킵: ${skipCount}건 | 실패: ${failCount}건`);
}

main().catch((err) => {
  console.error("마이그레이션 오류:", err);
  process.exit(1);
});
