import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = "centumbob-menu-images";

const supabaseUrl =
  process.env.SUPABASE_URL || "https://vaqfjjkwpzrolebvbnbl.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_JWT_TOKEN;

let supabase = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Storage용 안전한 파일명 생성
 * @param {number|string} restaurantId - 식당 ID
 * @param {string} dateRange - 날짜 범위 (예: "1.13-1.17")
 * @param {string} extension - 파일 확장자 (예: "jpg")
 * @returns {string} 파일명 (예: "6_1_13-1_17_1706123456789.jpg")
 */
export const generateStorageFileName = (restaurantId, dateRange, extension) => {
  // Supabase Storage 키는 ASCII만 허용 - 한글 제거
  const safeDateRange = dateRange.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const timestamp = Date.now();
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `${restaurantId}_${safeDateRange}_${timestamp}${ext}`;
};

/**
 * 이미지를 Supabase Storage에 업로드
 * @param {Buffer} buffer - 이미지 버퍼
 * @param {string} fileName - 저장할 파일명
 * @param {string} contentType - MIME 타입 (예: "image/jpeg")
 * @returns {Promise<{storagePath: string, publicUrl: string}>}
 */
export const uploadImage = async (buffer, fileName, contentType) => {
  if (!supabase) {
    throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
  }

  const storagePath = fileName;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("[Supabase Storage] 업로드 실패:", error.message);
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  const publicUrl = getPublicUrl(storagePath);

  console.log(`[Supabase Storage] 업로드 완료: ${storagePath}`);

  return { storagePath, publicUrl };
};

/**
 * Storage 경로로부터 public URL 생성
 * @param {string} storagePath - Storage 내 파일 경로
 * @returns {string} public URL
 */
export const getPublicUrl = (storagePath) => {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
};

/**
 * 이미지 경로를 public URL로 변환 (legacy 경로 감지 포함)
 * - "uploads/" 로 시작하면 legacy 로컬 경로 → 기존 /api/images/path/ 사용
 * - http:// 또는 https:// 로 시작하면 이미 URL → 그대로 반환
 * - 그 외 → Supabase Storage 경로로 간주 → public URL 생성
 * @param {string} imagePath - DB에 저장된 이미지 경로
 * @returns {string} 접근 가능한 이미지 URL
 */
export const resolveImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // 이미 절대 URL인 경우
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Legacy 로컬 경로 (uploads/ 로 시작)
  if (imagePath.startsWith("uploads/") || imagePath.startsWith("uploads\\")) {
    return `/api/images/path/${encodeURIComponent(imagePath)}`;
  }

  // Supabase Storage 경로
  return getPublicUrl(imagePath);
};

/**
 * 이미지 경로가 Supabase Storage 경로인지 확인
 * @param {string} imagePath - DB에 저장된 이미지 경로
 * @returns {boolean}
 */
export const isSupabaseStoragePath = (imagePath) => {
  if (!imagePath) return false;
  // legacy 경로가 아니고, 절대 URL이 아니면 Supabase Storage 경로
  return (
    !imagePath.startsWith("uploads/") &&
    !imagePath.startsWith("uploads\\") &&
    !imagePath.startsWith("http://") &&
    !imagePath.startsWith("https://")
  );
};
