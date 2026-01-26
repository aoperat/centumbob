import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import {
  saveMenuData,
  getMenuData,
  getAllMenuData,
  getMenuDataList,
  deleteAllMenuDataByRestaurant,
  deleteAllMenuDataByRestaurantId,
  getAllRestaurants,
  getActiveRestaurants,
  getRestaurantById,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  updateRestaurantOrders,
  getAllDateRanges,
  getActiveDateRanges,
  addDateRange,
  updateDateRange,
  deleteDateRange,
} from "./supabase-database.js";
import { transformDbDataForViewer } from "./utils/transform.js";
import {
  parseDateFromRange,
  generateJekyllPost,
  generateTistoryPost,
  saveBlogImage,
  generateBlogContent,
} from "./utils/blogGenerator.js";
import { getDailyNews } from "./utils/newsProvider.js";
import puppeteer from "puppeteer";
import { createWorker } from "tesseract.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 유틸리티 함수 ====================

// 로깅 레벨 제어 (프로덕션에서는 에러만 출력)
const isDevelopment = process.env.NODE_ENV !== "production";
const log = {
  info: (...args) => isDevelopment && console.log("[INFO]", ...args),
  debug: (...args) => isDevelopment && console.log("[DEBUG]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args),
};

// 허용된 이미지 타입
const ALLOWED_IMAGE_TYPES = {
  extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

/**
 * 이미지 파일 검증 (매직 바이트 확인)
 * @param {Buffer} buffer - 파일 버퍼
 * @param {string} originalMimeType - 클라이언트가 제공한 MIME 타입
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
const validateImageBuffer = async (buffer, originalMimeType) => {
  try {
    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType) {
      return { valid: false, error: "파일 형식을 확인할 수 없습니다." };
    }

    if (!ALLOWED_IMAGE_TYPES.mimeTypes.includes(fileType.mime)) {
      return {
        valid: false,
        error: `허용되지 않은 파일 형식입니다: ${fileType.mime}`,
      };
    }

    return { valid: true };
  } catch (error) {
    log.error("파일 타입 검증 실패:", error.message);
    return { valid: false, error: "파일 형식 검증 중 오류가 발생했습니다." };
  }
};

/**
 * 메뉴 배열 검증 및 정제
 * @param {Array} menuArray - 검증할 메뉴 배열
 * @returns {Array} - 정제된 메뉴 배열
 */
const validateAndCleanMenu = (menuArray) => {
  if (!Array.isArray(menuArray)) return [];

  return menuArray
    .map((item) => {
      let cleaned = String(item).trim();
      if (!cleaned) return null;
      if (cleaned.length < 2 && !/^[0-9가-힣]$/.test(cleaned)) return null;
      if (/^(메뉴|menu|item|항목|새\s*메뉴)\d*$/i.test(cleaned)) return null;
      if (/^\d+[,\d]*원?$/.test(cleaned)) return null;
      if (/^[^\w가-힣\s]+$/.test(cleaned)) return null;
      if (cleaned.length > 200) return null;
      cleaned = cleaned.replace(/\s+/g, " ");
      cleaned = cleaned.trim();
      return cleaned;
    })
    .filter((item) => item !== null && item.length > 0)
    .filter((item, index, self) => self.indexOf(item) === index);
};

/**
 * 가격 검증 및 정규화
 * @param {string} price - 검증할 가격
 * @returns {string} - 정규화된 가격
 */
const validateAndCleanPrice = (price) => {
  if (!price) return "";
  let cleaned = String(price).trim();
  if (!cleaned) return "";
  cleaned = cleaned.replace(/[^\d,원]/g, "");
  if (!/\d/.test(cleaned)) return "";
  const numbersOnly = cleaned.replace(/[^\d]/g, "");
  if (parseInt(numbersOnly) > 100000000) return "";
  if (parseInt(numbersOnly) < 100) return "";
  if (!cleaned.includes("원")) {
    cleaned = numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
  }
  return cleaned;
};

const app = express();
const PORT = process.env.PORT || 9101;

// CORS 설정
app.use(
  cors({
    origin: [
      "http://localhost:9102", // 프론트엔드 (개발 서버)
      "http://127.0.0.1:9102",
      "http://localhost:9103", // 뷰어 페이지 (개발 서버)
      "http://127.0.0.1:9103",
      "http://front.centum", // 프론트엔드 도메인
      "http://back.centum", // 백엔드 도메인
      "http://viewer.centum", // 뷰어 도메인
      "https://aoperat.github.io", // GitHub Pages (viewer)
      // 프로덕션 도메인은 환경 변수로 추가 가능
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",")
        : []),
    ],
    credentials: true,
  })
);

app.use(express.json());

// 헬스 체크 엔드포인트
app.get("/api/health", async (req, res) => {
  try {
    // 데이터베이스 연결 확인
    const testQuery = await getMenuDataList();
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 뷰어 페이지 정적 파일 서빙 (블로그 생성용)
const viewerDistPath = path.join(__dirname, "..", "viewer", "dist");
if (fs.existsSync(viewerDistPath)) {
  app.use("/viewer", express.static(viewerDistPath));
  console.log("뷰어 페이지 정적 파일 서빙 활성화:", viewerDistPath);
}

// uploads 디렉토리 설정
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 임시 업로드 폴더
const tempUploadsDir = path.join(__dirname, "uploads", "temp");
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

// Multer 설정 (디스크 스토리지 - 이미지 저장용)
// 임시 폴더에 먼저 저장 후 요청 처리에서 이동
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadsDir);
  },
  filename: (req, file, cb) => {
    // 타임스탬프 기반 파일명
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `image_${timestamp}${ext}`);
  },
});

// 이미지 저장용 Multer (디스크 스토리지)
const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("이미지 파일만 업로드 가능합니다."), false);
    }
  },
});

// 이미지 분석용 Multer (메모리 스토리지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabase 클라이언트 초기화
const supabaseUrl =
  process.env.SUPABASE_URL || "https://vaqfjjkwpzrolebvbnbl.supabase.co";
// service_role 키가 없으면 anon 키 사용 (RLS 정책이 제대로 설정되어 있어야 함)
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_JWT_TOKEN;

// Supabase 키가 없으면 null로 설정 (민원 기능 비활성화)
let supabase = null;
if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.warn("[WARN] Supabase 키가 설정되지 않았습니다. 민원 기능이 비활성화됩니다.");
}

// 이미지 분석 엔드포인트
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "이미지 파일이 필요합니다." });
    }

    // 파일 형식 검증 (매직 바이트 확인)
    const validation = await validateImageBuffer(
      req.file.buffer,
      req.file.mimetype
    );
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OpenAI API 키가 설정되지 않았습니다." });
    }

    // 이미지를 base64로 변환
    const imageBase64 = req.file.buffer.toString("base64");
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // 1. Tesseract OCR로 텍스트 1차 추출
    log.debug("OCR 분석 시작...");
    let ocrText = "";
    try {
      const worker = await createWorker("kor+eng");
      const ret = await worker.recognize(req.file.buffer);
      ocrText = ret.data.text;
      await worker.terminate();
      log.debug("OCR 분석 완료 (텍스트 길이):", ocrText.length);
    } catch (ocrError) {
      log.warn("OCR 분석 실패 (GPT Vision만 사용):", ocrError.message);
      // OCR 실패해도 계속 진행
    }

    // GPT API 호출 함수 (재시도 로직 포함)
    const callGPTAPI = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-2024-11-20",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `이 식단표 이미지를 정확하게 분석하여 다음 정보를 JSON 형식으로 추출해주세요.

[참고 정보]
다음은 이미지에서 OCR(광학 문자 인식)로 추출한 원본 텍스트입니다. 
이미지가 흐릿하거나 글자가 잘 안 보일 때 이 텍스트를 참고하여 정확도를 높이세요. 
단, OCR 텍스트는 구조가 깨져있을 수 있으므로 메뉴의 배치나 요일 확인은 반드시 이미지를 기준으로 하세요.

--- OCR 추출 텍스트 시작 ---
${ocrText}
--- OCR 추출 텍스트 끝 ---

중요 지침:
1. 이미지의 텍스트를 정확히 읽어야 합니다. 추측하지 마세요.
2. 메뉴명은 이미지에 표시된 그대로 정확히 추출하세요.
3. 가격 정보가 보이지 않으면 빈 문자열("")로 표시하세요.
4. 메뉴가 없는 요일/시간대는 빈 배열([])로 표시하세요.
5. 불확실한 정보는 포함하지 마세요.

추출할 정보:
1. 가격 정보:
   - lunch: 점심 가격 (예: "7,000원", "7000원", 가격이 없으면 "")
   - dinner: 저녁 가격 (예: "7,000원", "7000원", 가격이 없으면 "")

2. 메뉴 정보 (월요일부터 금요일까지):
   - 각 요일별로 점심(lunch)과 저녁(dinner) 메뉴를 배열로 추출
   - 메뉴명은 이미지에 표시된 정확한 텍스트를 사용
   - 각 메뉴는 별도의 배열 요소로 분리
   - 메뉴가 없는 경우 빈 배열([])로 표시

응답 형식 (반드시 이 형식을 정확히 따르세요):
{
  "price": {
    "lunch": "가격 또는 빈 문자열",
    "dinner": "가격 또는 빈 문자열"
  },
  "menus": {
    "월": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "화": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "수": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "목": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "금": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    }
  }
}

주의사항:
- 반드시 유효한 JSON 형식으로만 응답하세요
- 다른 설명이나 텍스트는 포함하지 마세요
- 모든 메뉴명은 실제 이미지에서 읽은 정확한 텍스트여야 합니다
- 추측하거나 예시를 사용하지 마세요`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                    detail: "high", // 고해상도 모드로 텍스트 인식률 향상
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          response_format: { type: "json_object" },
          temperature: 0.1, // 낮은 온도로 더 일관된 결과
        });
        return response;
      } catch (error) {
        // 재시도 (최대 1회)
        if (retryCount < 1) {
          console.log(`GPT API 호출 실패, 재시도 중... (${retryCount + 1}/1)`);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
          return callGPTAPI(retryCount + 1);
        }
        throw error;
      }
    };

    // GPT-4o Vision API 호출 (최신 버전 사용 - 더 나은 텍스트 인식률)
    const response = await callGPTAPI();

    // 응답 파싱
    const content = response.choices[0].message.content;
    let parsedData;

    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      // JSON 파싱 실패 시 기본 구조 반환
      console.error("JSON 파싱 오류:", parseError);
      parsedData = {
        price: { lunch: "", dinner: "" },
        menus: {
          월: { lunch: [], dinner: [] },
          화: { lunch: [], dinner: [] },
          수: { lunch: [], dinner: [] },
          목: { lunch: [], dinner: [] },
          금: { lunch: [], dinner: [] },
        },
      };
    }

    // 응답 구조 검증 및 정규화
    const result = {
      price: {
        lunch: validateAndCleanPrice(parsedData.price?.lunch),
        dinner: validateAndCleanPrice(parsedData.price?.dinner),
      },
      menus: {
        월: {
          lunch: validateAndCleanMenu(parsedData.menus?.월?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.월?.dinner),
        },
        화: {
          lunch: validateAndCleanMenu(parsedData.menus?.화?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.화?.dinner),
        },
        수: {
          lunch: validateAndCleanMenu(parsedData.menus?.수?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.수?.dinner),
        },
        목: {
          lunch: validateAndCleanMenu(parsedData.menus?.목?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.목?.dinner),
        },
        금: {
          lunch: validateAndCleanMenu(parsedData.menus?.금?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.금?.dinner),
        },
      },
    };

    // 응답 품질 검증
    const totalMenus = Object.values(result.menus).reduce((sum, day) => {
      return sum + (day.lunch?.length || 0) + (day.dinner?.length || 0);
    }, 0);

    const hasPrices = !!(result.price.lunch || result.price.dinner);
    const hasMenus = totalMenus > 0;

    // 품질 검증 로그
    console.log("이미지 분석 결과:", {
      prices: result.price,
      totalMenus,
      hasPrices,
      hasMenus,
      quality: hasPrices && hasMenus ? "good" : hasMenus ? "partial" : "poor",
    });

    // 품질이 너무 낮은 경우 경고 (하지만 결과는 반환)
    if (!hasMenus && !hasPrices) {
      console.warn(
        "경고: 분석 결과가 비어있습니다. 이미지 품질이나 형식을 확인해주세요."
      );
    }

    res.json(result);
  } catch (error) {
    console.error("이미지 분석 오류:", error);
    res.status(500).json({
      error: "이미지 분석 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 외부 API: 메뉴 업로드 엔드포인트 (이미지 + OCR + GPT + 저장)
app.post("/api/menu/upload", uploadImage.single("image"), async (req, res) => {
  try {
    // 필수 필드 검증
    const restaurant_id = req.body.restaurant_id
      ? parseInt(req.body.restaurant_id, 10)
      : null;
    const type = req.body.type; // "전체요일" 또는 "개별요일"
    const day_id = req.body.day_id; // 개별요일일 때만: "월", "화", "수", "목", "금"

    if (!req.file) {
      return res.status(400).json({ error: "이미지 파일이 필요합니다." });
    }

    if (!restaurant_id || isNaN(restaurant_id)) {
      return res.status(400).json({ error: "유효한 식당 ID가 필요합니다." });
    }

    if (!type || !["전체요일", "개별요일"].includes(type)) {
      return res
        .status(400)
        .json({ error: '타입 구분이 필요합니다. ("전체요일" 또는 "개별요일")' });
    }

    if (type === "개별요일") {
      const validDays = ["월", "화", "수", "목", "금"];
      if (!day_id || !validDays.includes(day_id)) {
        return res.status(400).json({
          error: `개별요일 모드에서는 유효한 요일 ID가 필요합니다. (${validDays.join(", ")})`,
        });
      }
    }

    // 활성 날짜 범위 조회
    const activeDateRanges = await getActiveDateRanges();
    if (activeDateRanges.length === 0) {
      return res.status(400).json({
        error: "활성화된 날짜 범위가 없습니다.",
      });
    }
    const activeDateRange = activeDateRanges[0].date_range;

    // 식당 정보 조회 및 검증
    const restaurant = await getRestaurantById(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({
        error: "식당을 찾을 수 없습니다.",
      });
    }

    console.log(
      `[외부 API] 메뉴 업로드 시작: restaurant_id=${restaurant_id}, type=${type}, day_id=${day_id || "N/A"}`
    );

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OpenAI API 키가 설정되지 않았습니다." });
    }

    // 이미지를 base64로 변환
    const imageBase64 = req.file.buffer.toString("base64");
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // 1. Tesseract OCR로 텍스트 1차 추출
    console.log("[외부 API] OCR 분석 시작...");
    let ocrText = "";
    try {
      const worker = await createWorker("kor+eng");
      const ret = await worker.recognize(req.file.buffer);
      ocrText = ret.data.text;
      await worker.terminate();
      console.log("[외부 API] OCR 분석 완료 (텍스트 길이):", ocrText.length);
    } catch (ocrError) {
      console.warn("[외부 API] OCR 분석 실패 (GPT Vision만 사용):", ocrError);
      // OCR 실패해도 계속 진행
    }

    // GPT API 호출 함수 (재시도 로직 포함)
    const callGPTAPI = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-2024-11-20",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `이 식단표 이미지를 정확하게 분석하여 다음 정보를 JSON 형식으로 추출해주세요.

[참고 정보]
다음은 이미지에서 OCR(광학 문자 인식)로 추출한 원본 텍스트입니다. 
이미지가 흐릿하거나 글자가 잘 안 보일 때 이 텍스트를 참고하여 정확도를 높이세요. 
단, OCR 텍스트는 구조가 깨져있을 수 있으므로 메뉴의 배치나 요일 확인은 반드시 이미지를 기준으로 하세요.

--- OCR 추출 텍스트 시작 ---
${ocrText}
--- OCR 추출 텍스트 끝 ---

중요 지침:
1. 이미지의 텍스트를 정확히 읽어야 합니다. 추측하지 마세요.
2. 메뉴명은 이미지에 표시된 그대로 정확히 추출하세요.
3. 가격 정보가 보이지 않으면 빈 문자열("")로 표시하세요.
4. 메뉴가 없는 요일/시간대는 빈 배열([])로 표시하세요.
5. 불확실한 정보는 포함하지 마세요.

추출할 정보:
1. 가격 정보:
   - lunch: 점심 가격 (예: "7,000원", "7000원", 가격이 없으면 "")
   - dinner: 저녁 가격 (예: "7,000원", "7000원", 가격이 없으면 "")

2. 메뉴 정보 (월요일부터 금요일까지):
   - 각 요일별로 점심(lunch)과 저녁(dinner) 메뉴를 배열로 추출
   - 메뉴명은 이미지에 표시된 정확한 텍스트를 사용
   - 각 메뉴는 별도의 배열 요소로 분리
   - 메뉴가 없는 경우 빈 배열([])로 표시

응답 형식 (반드시 이 형식을 정확히 따르세요):
{
  "price": {
    "lunch": "가격 또는 빈 문자열",
    "dinner": "가격 또는 빈 문자열"
  },
  "menus": {
    "월": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "화": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "수": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "목": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "금": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    }
  }
}

주의사항:
- 반드시 유효한 JSON 형식으로만 응답하세요
- 다른 설명이나 텍스트는 포함하지 마세요
- 모든 메뉴명은 실제 이미지에서 읽은 정확한 텍스트여야 합니다
- 추측하거나 예시를 사용하지 마세요`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        return response;
      } catch (error) {
        if (retryCount < 1) {
          console.log(
            `[외부 API] GPT API 호출 실패, 재시도 중... (${retryCount + 1}/1)`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return callGPTAPI(retryCount + 1);
        }
        throw error;
      }
    };

    // GPT-4o Vision API 호출
    const response = await callGPTAPI();

    // 응답 파싱
    const content = response.choices[0].message.content;
    let parsedData;

    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      console.error("[외부 API] JSON 파싱 오류:", parseError);
      parsedData = {
        price: { lunch: "", dinner: "" },
        menus: {
          월: { lunch: [], dinner: [] },
          화: { lunch: [], dinner: [] },
          수: { lunch: [], dinner: [] },
          목: { lunch: [], dinner: [] },
          금: { lunch: [], dinner: [] },
        },
      };
    }

    // 응답 구조 검증 및 정규화
    const analyzedData = {
      price: {
        lunch: validateAndCleanPrice(parsedData.price?.lunch),
        dinner: validateAndCleanPrice(parsedData.price?.dinner),
      },
      menus: {
        월: {
          lunch: validateAndCleanMenu(parsedData.menus?.월?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.월?.dinner),
        },
        화: {
          lunch: validateAndCleanMenu(parsedData.menus?.화?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.화?.dinner),
        },
        수: {
          lunch: validateAndCleanMenu(parsedData.menus?.수?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.수?.dinner),
        },
        목: {
          lunch: validateAndCleanMenu(parsedData.menus?.목?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.목?.dinner),
        },
        금: {
          lunch: validateAndCleanMenu(parsedData.menus?.금?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.금?.dinner),
        },
      },
    };

    // 기존 데이터 조회
    const existing = await getMenuData(restaurant_id, activeDateRange);
    let finalMenus = existing?.menus || {
      월: { lunch: [], dinner: [] },
      화: { lunch: [], dinner: [] },
      수: { lunch: [], dinner: [] },
      목: { lunch: [], dinner: [] },
      금: { lunch: [], dinner: [] },
    };

    // 메뉴 데이터 병합
    if (type === "전체요일") {
      // 전체 요일: 모든 요일에 동일한 메뉴 적용
      const days = ["월", "화", "수", "목", "금"];
      days.forEach((day) => {
        finalMenus[day] = {
          lunch: analyzedData.menus.월.lunch,
          dinner: analyzedData.menus.월.dinner,
        };
      });
    } else {
      // 개별 요일: 지정된 요일에만 메뉴 적용
      finalMenus[day_id] = {
        lunch: analyzedData.menus[day_id].lunch,
        dinner: analyzedData.menus[day_id].dinner,
      };
    }

    // 이미지 업로드 처리
    let imagePath = null;
    let imagePaths = existing?.image_paths || null;

    if (type === "전체요일") {
      // 전체 요일 모드: 하나의 이미지
      imagePath = moveFileToDestination(
        req.file.path,
        restaurant.name,
        activeDateRange,
        req.file.filename
      );
      imagePaths = null;
      console.log("[외부 API] 전체 요일 이미지 저장 완료:", imagePath);
    } else {
      // 개별 요일 모드: 요일별 이미지
      if (!imagePaths) {
        imagePaths = {};
      }
      const dayImagePath = moveFileToDestination(
        req.file.path,
        restaurant.name,
        activeDateRange,
        req.file.filename
      );
      imagePaths[day_id] = dayImagePath;
      imagePath = imagePaths["월"] || existing?.image_path || dayImagePath;
      console.log(
        `[외부 API] ${day_id}요일 이미지 저장 완료:`,
        dayImagePath
      );
    }

    // DB에 저장
    const saveResult = await saveMenuData({
      restaurant_id: restaurant_id,
      restaurant_name: restaurant.name,
      date_range: activeDateRange,
      price_lunch: analyzedData.price.lunch,
      price_dinner: analyzedData.price.dinner,
      menus: finalMenus,
      image_path: imagePath,
      image_paths: imagePaths,
      excluded_menu_items: null,
    });

    console.log("[외부 API] 메뉴 데이터 저장 완료");

    res.json({
      success: true,
      message: "메뉴 데이터가 성공적으로 저장되었습니다.",
      data: {
        restaurant_id: restaurant_id,
        restaurant_name: restaurant.name,
        date_range: activeDateRange,
        type: type,
        day_id: type === "개별요일" ? day_id : null,
        image_path: imagePath,
        image_paths: imagePaths,
        menus: finalMenus,
        price: analyzedData.price,
      },
    });
  } catch (error) {
    console.error("[외부 API] 메뉴 업로드 오류:", error);
    res.status(500).json({
      error: "메뉴 업로드 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 데이터 저장 디렉토리 경로
const dataDir = path.join(__dirname, "..", "data");
const menuDataPath = path.join(dataDir, "menu-data.json");

// data 디렉토리가 없으면 생성
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 기존 데이터 로드 함수
const loadMenuData = () => {
  try {
    if (fs.existsSync(menuDataPath)) {
      const fileContent = fs.readFileSync(menuDataPath, "utf-8");
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error("데이터 로드 오류:", error);
  }
  return {};
};

// 파일을 임시 폴더에서 목적지로 이동하는 헬퍼 함수
const moveFileToDestination = (tempPath, restaurant, dateRange, filename) => {
  const safeRestaurant = restaurant.replace(/[^a-zA-Z0-9가-힣]/g, "_");
  const safeDateRange = dateRange.replace(/[^a-zA-Z0-9가-힣]/g, "_");
  const destDir = path.join(uploadsDir, safeRestaurant, safeDateRange);

  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
  } catch (mkdirError) {
    console.error(`디렉토리 생성 실패 (${destDir}):`, mkdirError.message);
    throw new Error(`파일 저장 디렉토리를 생성할 수 없습니다: ${mkdirError.message}`);
  }

  const destPath = path.join(destDir, filename);

  try {
    fs.renameSync(tempPath, destPath);
  } catch (renameError) {
    // EXDEV: 다른 파티션 간 이동 시 rename 실패
    if (renameError.code === "EXDEV") {
      try {
        fs.copyFileSync(tempPath, destPath);
        fs.unlinkSync(tempPath);
      } catch (copyError) {
        console.error(`파일 복사 실패:`, copyError.message);
        throw new Error(`파일을 이동할 수 없습니다: ${copyError.message}`);
      }
    } else {
      console.error(`파일 이동 실패 (${tempPath} -> ${destPath}):`, renameError.message);
      throw new Error(`파일을 이동할 수 없습니다: ${renameError.message}`);
    }
  }

  const relativePath = path.relative(__dirname, destPath);
  return relativePath.split(path.sep).join("/");
};

// 데이터 저장 엔드포인트 (이미지 포함, DB 저장)
// any()를 사용하여 한글 필드명 인코딩 문제 방지
app.post(
  "/api/save",
  uploadImage.any(),
  async (req, res) => {
    try {
      const adminData = JSON.parse(req.body.data || "{}");
      const uploadedFiles = req.files || [];
      const useAllDays = adminData.use_all_days !== false; // 기본값 true

      // 업로드된 파일들을 필드명 기준으로 정리
      const files = {};
      uploadedFiles.forEach((file) => {
        if (!files[file.fieldname]) {
          files[file.fieldname] = [];
        }
        files[file.fieldname].push(file);
      });

      console.log("[저장] 업로드된 파일 필드:", Object.keys(files));

      // 필수 필드 검증
      if (!adminData.name || !adminData.date) {
        return res.status(400).json({
          error: "필수 필드가 누락되었습니다. (name, date)",
        });
      }

      // restaurantId가 없으면 경고 로그 출력
      if (!adminData.restaurantId) {
        console.warn('[/api/save] Warning: restaurantId가 전달되지 않았습니다. restaurant_name으로 조회 시도:', adminData.name);
      }

      // 기존 데이터 조회 (이미지 경로 유지용)
      const existing = await getMenuData(adminData.name, adminData.date);
      let imagePath = null;
      let imagePaths = existing?.image_paths || null;

      if (useAllDays) {
        // 전체 요일 모드: 하나의 이미지
        const imageFile = files?.image?.[0];
        if (imageFile) {
          // 임시 폴더에서 목적지로 이동
          imagePath = moveFileToDestination(
            imageFile.path,
            adminData.name,
            adminData.date,
            imageFile.filename
          );
          console.log("전체 요일 이미지 저장 완료:", imagePath);
        } else if (existing?.image_path) {
          imagePath = existing.image_path;
        }
        // 전체 요일 모드에서는 image_paths를 null로 설정
        imagePaths = null;
      } else {
        // 개별 요일 모드: 요일별 이미지
        const days = ["월", "화", "수", "목", "금"];
        if (!imagePaths) {
          imagePaths = {};
        }

        days.forEach((day) => {
          const dayFile = files?.[`image_${day}`]?.[0];
          if (dayFile) {
            // 임시 폴더에서 목적지로 이동
            const dayImagePath = moveFileToDestination(
              dayFile.path,
              adminData.name,
              adminData.date,
              dayFile.filename
            );
            imagePaths[day] = dayImagePath;
            console.log(`${day}요일 이미지 저장 완료:`, dayImagePath);
          } else if (existing?.image_paths?.[day]) {
            // 기존 이미지 유지
            imagePaths[day] = existing.image_paths[day];
          }
        });

        // image_path는 첫 번째 이미지 또는 null
        imagePath = imagePaths["월"] || existing?.image_path || null;
      }

      // DB에 저장
      const result = await saveMenuData({
        restaurant_id: adminData.restaurantId,
        restaurant_name: adminData.name,
        date_range: adminData.date,
        price_lunch: "",
        price_dinner: "",
        menus: adminData.menus || {},
        image_path: imagePath,
        image_paths: imagePaths,
        excluded_menu_items: adminData.excluded_menu_items || null,
      });

      res.json({
        success: true,
        message: "데이터가 성공적으로 저장되었습니다.",
        imagePath: imagePath,
        imagePaths: imagePaths,
      });
    } catch (error) {
      console.error("데이터 저장 오류:", error);
      res.status(500).json({
        error: "데이터 저장 중 오류가 발생했습니다.",
        message: error.message,
      });
    }
  }
);

// 이미지 파일 제공 엔드포인트 (경로 직접 사용) - 더 구체적인 라우트를 먼저 등록
// Express의 와일드카드 라우팅 문제를 해결하기 위해 정규식 사용
app.get(/^\/api\/images\/path\/(.+)$/, async (req, res) => {
  try {
    // req.path에서 정규식으로 경로 추출
    const match = req.path.match(/^\/api\/images\/path\/(.+)$/);
    if (!match || !match[1]) {
      return res.status(400).json({ error: "잘못된 경로 형식입니다." });
    }

    let imagePath = match[1]; // 첫 번째 캡처 그룹

    // URL 디코딩
    try {
      imagePath = decodeURIComponent(imagePath);
    } catch (e) {
      console.warn("URL 디코딩 경고:", e.message);
    }

    // URL 경로 구분자를 시스템 경로 구분자로 변환
    const normalizedPath = imagePath.split("/").join(path.sep);
    const fullPath = path.join(__dirname, normalizedPath);

    console.log("[/api/images/path] 요청:", {
      reqUrl: req.url,
      reqPath: req.path,
      match: match[1],
      imagePath,
      normalizedPath,
      fullPath,
      __dirname,
    });

    // 보안: 상대 경로 공격 방지
    const resolvedPath = path.resolve(fullPath);
    const basePath = path.resolve(__dirname);

    if (!resolvedPath.startsWith(basePath)) {
      console.log("[/api/images/path] 보안 오류:", { resolvedPath, basePath });
      return res.status(403).json({ error: "접근이 거부되었습니다." });
    }

    if (!fs.existsSync(resolvedPath)) {
      console.log("[/api/images/path] 파일 없음:", resolvedPath);
      console.log("[/api/images/path] 시도한 경로들:", {
        imagePath,
        normalizedPath,
        fullPath,
        resolvedPath,
        basePath,
        exists: fs.existsSync(fullPath),
      });
      return res.status(404).json({ error: "이미지 파일을 찾을 수 없습니다." });
    }

    // 이미지 파일 전송
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error("이미지 제공 오류:", error);
    res.status(500).json({
      error: "이미지 제공 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// OCR GET 테스트 프록시 API
app.get("/api/ocr/test", async (req, res) => {
  try {
    const response = await fetch("http://ocr.home", {
      method: "GET",
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `OCR GET 요청 실패: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("OCR GET 테스트 오류:", error);
    res.status(500).json({
      error: "OCR GET 테스트 실패",
      message: error.message,
    });
  }
});

// OCR POST 테스트 프록시 API
app.post("/api/ocr/test-post", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "이미지 파일이 필요합니다.",
      });
    }

    // FormData 생성하여 ocr.home/ocr로 전달 (axios 사용)
    const FormDataLib = (await import("form-data")).default;
    const formData = new FormDataLib();

    // 필드명을 'file' 또는 'image'로 시도 (FastAPI는 보통 'file'을 사용)
    const fieldName = "file"; // FastAPI의 File() 파라미터는 보통 'file' 이름 사용
    formData.append(fieldName, req.file.buffer, {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    console.log(
      "[OCR POST] 전송 중 - 파일 크기:",
      req.file.buffer.length,
      "bytes, 타입:",
      req.file.mimetype,
      "필드명:",
      fieldName
    );

    const response = await axios.post("http://ocr.home/ocr", formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000, // 30초 타임아웃
    });

    res.json(response.data);
  } catch (error) {
    console.error("OCR POST 테스트 오류:", error);
    if (error.response) {
      console.error("OCR POST 응답 오류:", error.response.data);
      return res.status(error.response.status).json({
        error: `OCR POST 요청 실패: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data,
      });
    }
    res.status(500).json({
      error: "OCR POST 테스트 실패",
      message: error.message,
    });
  }
});

// 데이터 불러오기 API
app.get("/api/load", async (req, res) => {
  try {
    console.log("[/api/load] 요청 받음:", req.query);
    const { restaurant, restaurantId, date } = req.query;

    // 특정 식당/날짜 데이터 조회
    if ((restaurant || restaurantId) && date) {
      try {
        // restaurantId 우선 사용, 없으면 restaurant 사용 (하위 호환성)
        const identifier = restaurantId || restaurant;
        const menuData = await getMenuData(identifier, date);

        if (!menuData) {
          console.log("[/api/load] 데이터 없음:", restaurant, date);
          // 404 대신 200 OK와 null 반환하여 프론트엔드에서 조용히 처리
          return res.status(200).json(null);
        }

        // 이미지 URL 생성 - 이미지 경로를 직접 사용 (URL 인코딩 문제 방지)
        let imageUrl = null;
        let imageUrls = null;

        // 요일별 이미지가 있으면 imageUrls 객체 생성
        if (menuData.image_paths) {
          imageUrls = {};
          const days = ["월", "화", "수", "목", "금"];
          days.forEach((day) => {
            if (menuData.image_paths[day]) {
              imageUrls[day] = `/api/images/path/${encodeURIComponent(
                menuData.image_paths[day]
              )}`;
            }
          });
        }

        // 하위 호환성을 위해 imageUrl도 유지
        if (menuData.image_path) {
          imageUrl = `/api/images/path/${encodeURIComponent(
            menuData.image_path
          )}`;
        } else if (imageUrls?.["월"]) {
          imageUrl = imageUrls["월"];
        }

        res.json({
          ...menuData,
          imageUrl: imageUrl,
          imageUrls: imageUrls,
        });
      } catch (dbError) {
        console.error("[/api/load] 데이터베이스 조회 오류:", dbError);
        res.status(500).json({
          error: "데이터베이스 조회 중 오류가 발생했습니다.",
          message: dbError.message,
        });
      }
    }
    // 목록 조회
    else if (req.query.list === "true") {
      try {
        const list = await getMenuDataList();
        res.json(list);
      } catch (listError) {
        console.error("[/api/load] 목록 조회 오류:", listError);
        res.status(500).json({
          error: "목록 조회 중 오류가 발생했습니다.",
          message: listError.message,
        });
      }
    }
    // 파라미터 없으면 에러
    else {
      res.status(400).json({
        error: "restaurant와 date 파라미터가 필요합니다.",
      });
    }
  } catch (error) {
    console.error("[/api/load] 전체 오류:", error);
    console.error("[/api/load] 스택 트레이스:", error.stack);
    res.status(500).json({
      error: "데이터 조회 중 오류가 발생했습니다.",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// 식당의 모든 메뉴 데이터 삭제 API
app.delete("/api/menu-data/restaurant/:restaurantName", async (req, res) => {
  try {
    const { restaurantName } = req.params;

    if (!restaurantName) {
      return res.status(400).json({
        error: "식당 이름이 필요합니다.",
      });
    }

    const result = await deleteAllMenuDataByRestaurant(restaurantName);

    res.json({
      success: true,
      message: `'${restaurantName}' 식당의 모든 메뉴 데이터가 삭제되었습니다.`,
      changes: result.changes,
    });
  } catch (error) {
    console.error("식당 메뉴 데이터 삭제 오류:", error);
    res.status(500).json({
      error: "식당 메뉴 데이터를 삭제하는 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// restaurant_id 기반 식당의 모든 메뉴 데이터 삭제
app.delete("/api/menu-data/restaurant-id/:restaurantId", async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.restaurantId, 10);

    if (!restaurantId || isNaN(restaurantId)) {
      return res.status(400).json({
        error: "유효한 식당 ID가 필요합니다.",
      });
    }

    const result = await deleteAllMenuDataByRestaurantId(restaurantId);

    res.json({
      success: true,
      message: `식당 ID ${restaurantId}의 모든 메뉴 데이터가 삭제되었습니다.`,
      deleted: result.changes,
    });
  } catch (error) {
    console.error("식당 메뉴 데이터 삭제 오류:", error);
    res.status(500).json({
      error: "식당 메뉴 데이터를 삭제하는 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 게시 API: DB 데이터를 뷰어용 JSON 파일로 생성
app.post("/api/publish", async (req, res) => {
  try {
    // 활성화된 날짜 범위 조회
    const activeDateRanges = await getActiveDateRanges();
    if (activeDateRanges.length === 0) {
      return res.status(400).json({
        error:
          "활성화된 날짜 범위가 없습니다. 기준 정보 관리에서 날짜 범위를 활성화해주세요.",
      });
    }

    const activeDateRange = activeDateRanges[0].date_range;
    console.log("[게시] 활성 날짜 범위:", activeDateRange);

    // DB에서 활성 날짜 범위의 데이터만 조회
    const allMenuData = await getAllMenuData();
    const allData = allMenuData.filter(
      (data) => data.date_range === activeDateRange
    );

    console.log("[게시] DB에서 조회된 데이터 수:", allData.length);
    console.log("[게시] 조회된 식당명 목록:", allData.map(d => d.restaurant_name));

    // 빈 메뉴 데이터 확인 함수
    const hasMenuData = (menus) => {
      const days = ["월", "화", "수", "목", "금"];
      return days.some(day => {
        const dayMenu = menus[day] || { lunch: [], dinner: [] };
        return (dayMenu.lunch && dayMenu.lunch.length > 0) || 
               (dayMenu.dinner && dayMenu.dinner.length > 0);
      });
    };

    // 게시 전 필터링: 빈 메뉴 데이터 제외
    const dataToPublish = allData.filter(dbData => {
      const hasData = hasMenuData(dbData.menus);
      if (!hasData) {
        console.warn(`[게시] ${dbData.restaurant_name}는 메뉴 데이터가 비어있어 게시에서 제외됩니다.`);
      }
      return hasData;
    });

    console.log("[게시] 필터링 후 게시할 데이터 수:", dataToPublish.length);

    if (dataToPublish.length === 0) {
      return res.status(400).json({
        error: `활성화된 날짜 범위(${activeDateRange})에 게시할 데이터가 없습니다. 먼저 데이터를 저장해주세요.`,
      });
    }

    // 기준데이터(restaurants) 조회하여 식당 ID를 키로 하는 맵 생성
    const allRestaurants = await getAllRestaurants();
    const restaurantMap = {};
    allRestaurants.forEach((r) => {
      restaurantMap[r.id] = r;
    });

    // viewer/public/images/ 디렉토리 생성
    const viewerImagesDir = path.join(
      __dirname,
      "..",
      "viewer",
      "public",
      "images"
    );
    if (!fs.existsSync(viewerImagesDir)) {
      fs.mkdirSync(viewerImagesDir, { recursive: true });
    }

    // 뷰어 형식으로 변환 (ID 기반 배열)
    const viewerData = [];
    dataToPublish.forEach((dbData) => {
      try {
        let imageBase64 = null;

      // 요일별 이미지가 있으면 요일별로 처리
      const imagePathsByDay = dbData.image_paths || {};
      const days = ["월", "화", "수", "목", "금"];

      // 요일별 이미지 파일 복사
      if (Object.keys(imagePathsByDay).length > 0) {
        days.forEach((day) => {
          if (imagePathsByDay[day]) {
            try {
              const imageAbsolutePath = path.join(
                __dirname,
                imagePathsByDay[day]
              );
              if (fs.existsSync(imageAbsolutePath)) {
                const imageFileName = path.basename(imageAbsolutePath);
                const viewerImagePath = path.join(
                  viewerImagesDir,
                  imageFileName
                );
                // 같은 파일명이 아니면 복사
                if (
                  !fs.existsSync(viewerImagePath) ||
                  fs.statSync(imageAbsolutePath).mtime >
                    fs.statSync(viewerImagePath).mtime
                ) {
                  fs.copyFileSync(imageAbsolutePath, viewerImagePath);
                  console.log(
                    `[${day}요일] 이미지 복사 완료:`,
                    viewerImagePath
                  );
                }
                // 첫 번째 이미지를 base64로도 변환 (하위 호환성)
                if (!imageBase64 && day === "월") {
                  const imageBuffer = fs.readFileSync(imageAbsolutePath);
                  const imageExt = path
                    .extname(imageAbsolutePath)
                    .toLowerCase();
                  let mimeType = "image/jpeg";
                  if (imageExt === ".png") mimeType = "image/png";
                  else if (imageExt === ".gif") mimeType = "image/gif";
                  else if (imageExt === ".webp") mimeType = "image/webp";
                  imageBase64 = `data:${mimeType};base64,${imageBuffer.toString(
                    "base64"
                  )}`;
                }
              }
            } catch (imageError) {
              console.error(`[${day}요일] 이미지 처리 오류:`, imageError);
            }
          }
        });
      }

      // 전체 요일 모드: 단일 이미지 처리
      if (!imageBase64 && dbData.image_path) {
        try {
          const imageAbsolutePath = path.join(__dirname, dbData.image_path);
          if (fs.existsSync(imageAbsolutePath)) {
            const imageBuffer = fs.readFileSync(imageAbsolutePath);
            const imageExt = path.extname(imageAbsolutePath).toLowerCase();
            let mimeType = "image/jpeg";

            if (imageExt === ".png") mimeType = "image/png";
            else if (imageExt === ".gif") mimeType = "image/gif";
            else if (imageExt === ".webp") mimeType = "image/webp";

            imageBase64 = `data:${mimeType};base64,${imageBuffer.toString(
              "base64"
            )}`;

            // 이미지 파일을 viewer/public/images/로도 복사 (상대 경로 참조용)
            const imageFileName = path.basename(imageAbsolutePath);
            const viewerImagePath = path.join(viewerImagesDir, imageFileName);
            if (
              !fs.existsSync(viewerImagePath) ||
              fs.statSync(imageAbsolutePath).mtime >
                fs.statSync(viewerImagePath).mtime
            ) {
              fs.copyFileSync(imageAbsolutePath, viewerImagePath);
              console.log("이미지 복사 완료:", viewerImagePath);
            }
          }
        } catch (imageError) {
          console.error("이미지 처리 오류:", imageError);
        }
      }

      // 기준데이터에서 해당 식당 정보 가져오기 (restaurant_id로 조회)
      const restaurantInfo = restaurantMap[dbData.restaurant_id] || null;
      if (!restaurantInfo) {
        console.warn(`[게시] 경고: restaurant_id ${dbData.restaurant_id} (${dbData.restaurant_name})에 대한 기준데이터를 찾을 수 없습니다.`);
      }
      const transformed = transformDbDataForViewer(
        dbData,
        imageBase64,
        restaurantInfo
      );
      viewerData.push(transformed);
      } catch (error) {
        console.error(`[게시] ${dbData.restaurant_name} 변환 실패:`, error);
        // 에러가 발생해도 계속 진행
      }
    });

    console.log("[게시] 변환 후 식당 목록:", viewerData.map(d => `${d.name}(ID:${d.id})`));

    // sort_order로 정렬
    viewerData.sort((a, b) => a.sort_order - b.sort_order);

    console.log("[게시] 정렬 후 식당 목록:", viewerData.map(d => `${d.name}(ID:${d.id})`));

    // 기준데이터에 있지만 게시되지 않은 식당 확인 (ID 기반)
    const publishedIds = viewerData.map(d => d.id);
    const allRestaurantIds = allRestaurants.map(r => r.id);
    const missingRestaurantIds = allRestaurantIds.filter(id => !publishedIds.includes(id));
    const missingRestaurants = missingRestaurantIds.map(id => restaurantMap[id]?.name).filter(Boolean);
    if (missingRestaurants.length > 0) {
      console.warn("[게시] 경고: 다음 식당들이 게시되지 않았습니다:", missingRestaurants);
    }

    // JSON 파일로 저장
    fs.writeFileSync(
      menuDataPath,
      JSON.stringify(viewerData, null, 2),
      "utf-8"
    );

    // viewer/public/data/로도 복사
    const viewerDataPath = path.join(
      __dirname,
      "..",
      "viewer",
      "public",
      "data",
      "menu-data.json"
    );
    const viewerDataDir = path.dirname(viewerDataPath);
    if (!fs.existsSync(viewerDataDir)) {
      fs.mkdirSync(viewerDataDir, { recursive: true });
    }
    fs.writeFileSync(
      viewerDataPath,
      JSON.stringify(viewerData, null, 2),
      "utf-8"
    );

    res.json({
      success: true,
      message: "데이터가 성공적으로 게시되었습니다.",
      count: dataToPublish.length,
      published: viewerData.map(d => d.name),
      missing: missingRestaurants || []
    });
  } catch (error) {
    console.error("데이터 게시 오류:", error);
    res.status(500).json({
      error: "데이터 게시 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 자동 게시 & Git Push API ====================

// ==================== 블로그 생성 API ====================

// 블로그 생성 상태 확인 엔드포인트 (디버깅용)
app.get("/api/blog/status", async (req, res) => {
  try {
    const viewerDistPath = path.join(
      __dirname,
      "..",
      "viewer",
      "dist",
      "index.html"
    );
    const viewerUrl = process.env.VIEWER_URL || "http://localhost:9103";

    res.json({
      status: "ok",
      viewerUrl: viewerUrl,
      viewerDistExists: fs.existsSync(viewerDistPath),
      puppeteerInstalled: true,
      platform: process.platform,
      nodeVersion: process.version,
    });
  } catch (error) {
    res.status(500).json({
      error: "상태 확인 실패",
      message: error.message,
    });
  }
});

// 블로그 포스트 생성 (스크린샷 + Jekyll 포스트)
app.post("/api/blog/generate", async (req, res) => {
  let browser = null;

  try {
    console.log("[블로그 생성] 요청 받음:", req.body);
    const { day, dateRange } = req.body;

    // 필수 파라미터 검증
    if (!day || !dateRange) {
      console.error("[블로그 생성] 필수 파라미터 누락:", { day, dateRange });
      return res.status(400).json({
        error: "day와 dateRange 파라미터가 필요합니다.",
      });
    }

    // 요일 검증
    const validDays = ["월", "화", "수", "목", "금"];
    if (!validDays.includes(day)) {
      console.error("[블로그 생성] 유효하지 않은 요일:", day);
      return res.status(400).json({
        error: `유효하지 않은 요일입니다. 가능한 값: ${validDays.join(", ")}`,
      });
    }

    // 날짜 파싱
    let dateInfo;
    try {
      dateInfo = parseDateFromRange(dateRange, day);
      console.log("[블로그 생성] 날짜 정보:", dateInfo);
    } catch (parseError) {
      console.error("[블로그 생성] 날짜 파싱 오류:", parseError);
      return res.status(400).json({
        error: "날짜 파싱 실패",
        message: parseError.message,
        details: `날짜 범위: "${dateRange}", 요일: "${day}"`,
      });
    }

    // 뷰어 페이지 URL 생성
    // 1순위: 환경 변수
    // 2순위: 개발 서버 (9103 포트) - 항상 개발 서버 우선 사용
    // 3순위: 빌드된 뷰어 페이지 (정적 파일) - 개발 서버가 없을 때만
    let viewerUrl = process.env.VIEWER_URL;

    if (!viewerUrl) {
      // 개발 서버 포트 (9103) 우선 사용
      viewerUrl = "http://localhost:9103";
      console.log("[블로그 생성] 개발 서버 사용:", viewerUrl);

      // 개발 서버가 실행 중인지 확인 (선택적)
      // 만약 개발 서버가 없으면 빌드된 파일 사용
      // const viewerDistPath = path.join(__dirname, '..', 'viewer', 'dist', 'index.html');
      // if (fs.existsSync(viewerDistPath)) {
      //   const serverPort = process.env.PORT || 3000;
      //   viewerUrl = `http://localhost:${serverPort}/viewer`;
      //   console.log('[블로그 생성] 빌드된 뷰어 페이지 사용 (개발 서버 없음):', viewerUrl);
      // }
    } else {
      console.log("[블로그 생성] 환경 변수에서 뷰어 URL 사용:", viewerUrl);
    }

    const urlWithDay = `${viewerUrl}?day=${encodeURIComponent(day)}`;
    console.log("[블로그 생성] 뷰어 페이지 URL:", urlWithDay);

    // Puppeteer로 스크린샷 생성
    try {
      console.log("[블로그 생성] Puppeteer 브라우저 시작...");

      // Windows 환경에서의 Puppeteer 설정
      const puppeteerOptions = {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--no-first-run",
          "--no-zygote",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--force-color-profile=srgb", // 색상 프로파일 강제 설정
          "--font-render-hinting=none", // 폰트 렌더링 개선
          "--enable-font-antialiasing", // 폰트 안티앨리어싱 활성화
          "--disable-lcd-text", // LCD 텍스트 렌더링 비활성화 (선명도 개선)
        ],
      };

      // Windows에서 실행 파일 경로가 필요한 경우
      if (process.platform === "win32") {
        // Windows에서는 기본 실행 파일 경로 사용
        console.log("[블로그 생성] Windows 환경 감지");
      }

      browser = await puppeteer.launch(puppeteerOptions);
      console.log("[블로그 생성] Puppeteer 브라우저 시작 완료");
    } catch (browserError) {
      console.error(
        "[블로그 생성] Puppeteer 브라우저 시작 실패:",
        browserError
      );
      console.error("[블로그 생성] 에러 상세:", {
        message: browserError.message,
        stack: browserError.stack,
        name: browserError.name,
      });
      throw new Error(
        `Puppeteer 브라우저 시작 실패: ${browserError.message}. Chrome/Chromium이 설치되어 있는지 확인하세요.`
      );
    }

    let page;
    try {
      page = await browser.newPage();
      console.log("[블로그 생성] 새 페이지 생성 완료");
    } catch (pageError) {
      console.error("[블로그 생성] 페이지 생성 실패:", pageError);
      throw new Error(`페이지 생성 실패: ${pageError.message}`);
    }

    // 뷰포트 크기 설정 (식단표 전체가 보이도록)
    // deviceScaleFactor를 높여 고해상도 렌더링
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2 // 2배 해상도로 렌더링 (Retina 디스플레이)
    });
    console.log("[블로그 생성] 뷰포트 설정 완료 (2x 해상도)");

    // 화면 모드로 렌더링 (프린트 모드 방지)
    await page.emulateMediaType('screen');
    console.log("[블로그 생성] 미디어 타입을 'screen'으로 설정");

    // 페이지 로드 대기
    try {
      console.log("[블로그 생성] 페이지 로드 시작:", urlWithDay);

      // 먼저 페이지가 접근 가능한지 확인
      const response = await page.goto(urlWithDay, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      if (!response || !response.ok()) {
        throw new Error(
          `페이지 응답 실패: ${response ? response.status() : "응답 없음"}`
        );
      }

      console.log("[블로그 생성] 페이지 로드 완료, 상태:", response.status());
    } catch (gotoError) {
      console.error("[블로그 생성] 페이지 로드 실패:", gotoError);
      console.error("[블로그 생성] 에러 상세:", {
        message: gotoError.message,
        name: gotoError.name,
        url: urlWithDay,
      });
      throw new Error(
        `뷰어 페이지 접속 실패: ${gotoError.message}. 뷰어 페이지가 ${urlWithDay}에서 실행 중인지 확인하세요.`
      );
    }

    // 메뉴 데이터가 로드되고 렌더링될 때까지 대기
    try {
      console.log("[블로그 생성] 메뉴 테이블 렌더링 대기 중...");

      // 로딩 스피너가 사라지고 메뉴 테이블이 나타날 때까지 대기
      await page.waitForFunction(
        () => {
          // 로딩 스피너가 없고, 메뉴 테이블이 존재하는지 확인
          const loadingSpinner = document.querySelector(".animate-spin");
          const menuTable = document.querySelector("table");
          return !loadingSpinner && menuTable !== null;
        },
        { timeout: 30000 }
      );
      console.log("[블로그 생성] 메뉴 테이블 렌더링 완료");

      // 추가 대기 (애니메이션, 레이아웃 안정화, CSS 완전 적용)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("[블로그 생성] 렌더링 안정화 대기 완료");
    } catch (waitError) {
      console.warn(
        "[블로그 생성] 메뉴 테이블 대기 실패, 계속 진행:",
        waitError.message
      );
      // 대기 실패해도 계속 진행 (타임아웃 등)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // 스크린샷 생성
    const screenshotDir = path.join(
      __dirname,
      "..",
      "_posts",
      "assets",
      "images"
    );
    try {
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        console.log("[블로그 생성] 스크린샷 디렉토리 생성:", screenshotDir);
      }
    } catch (dirError) {
      console.error("[블로그 생성] 디렉토리 생성 실패:", dirError);
      throw new Error(`디렉토리 생성 실패: ${dirError.message}`);
    }

    const screenshotFilename = `menu-${dateInfo.dateString}.png`;
    const screenshotPath = path.join(screenshotDir, screenshotFilename);

    try {
      console.log("[블로그 생성] 스크린샷 생성 시작...");

      // 스크린샷 전 텍스트 색상 강제 적용 (흐릿한 색상 문제 해결)
      await page.evaluate(() => {
        // 모든 텍스트 요소의 색상을 진하게 설정
        const style = document.createElement('style');
        style.textContent = `
          table * {
            color: #000000 !important;
            opacity: 1 !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
          }
          table th {
            color: #1e293b !important;
          }
          table td {
            color: #334155 !important;
          }
          table .text-slate-800 {
            color: #1e293b !important;
          }
          table .text-slate-700 {
            color: #334155 !important;
          }
          table .text-slate-600 {
            color: #475569 !important;
          }
          table .text-slate-500 {
            color: #64748b !important;
          }
          table .text-orange-700 {
            color: #c2410c !important;
          }
          table .text-indigo-700 {
            color: #4338ca !important;
          }
        `;
        document.head.appendChild(style);
        console.log('[Puppeteer] 텍스트 색상 강제 적용 완료');
      });

      console.log("[블로그 생성] 텍스트 색상 강제 적용 완료, 스크린샷 캡처 시작");

      // 색상 적용 후 잠깐 대기
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 메뉴 테이블만 스크린샷 캡처
      const tableElement = await page.$("main table");
      if (tableElement) {
        console.log("[블로그 생성] 테이블 요소 찾음, 테이블만 캡처");
        await tableElement.screenshot({
          path: screenshotPath,
          type: "png",
          omitBackground: false, // 배경색 유지
        });
      } else {
        // 테이블을 찾을 수 없으면 전체 페이지 캡처 (폴백)
        console.log(
          "[블로그 생성] 테이블 요소를 찾을 수 없음, 전체 페이지 캡처"
        );
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: "png",
          omitBackground: false, // 배경색 유지
        });
      }

      console.log("[블로그 생성] 스크린샷 생성 완료:", screenshotPath);
    } catch (screenshotError) {
      console.error("[블로그 생성] 스크린샷 생성 실패:", screenshotError);
      throw new Error(`스크린샷 생성 실패: ${screenshotError.message}`);
    }

    // 이미지를 _posts/assets/images로 복사하고 상대 경로 얻기
    const postsDir = path.join(__dirname, "..", "_posts");
    let imageRelativePath;
    try {
      imageRelativePath = saveBlogImage(
        screenshotPath,
        screenshotFilename,
        postsDir
      );
      console.log("[블로그 생성] 이미지 저장 완료:", imageRelativePath);
    } catch (imageError) {
      console.error("[블로그 생성] 이미지 저장 실패:", imageError);
      throw new Error(`이미지 저장 실패: ${imageError.message}`);
    }

    // 뉴스 데이터 가져오기 (실제 뉴스 크롤링 + GPT 정리)
    console.log("[블로그 생성] 뉴스 데이터 수집 시작...");
    const newsData = await getDailyNews(dateInfo.dateString);
    console.log(
      "[블로그 생성] 뉴스 데이터 수집 완료:",
      JSON.stringify(newsData, null, 2).slice(0, 500) + "..."
    );

    // GPT 콘텐츠 생성 (메뉴 데이터가 있는 경우)
    let gptContent = null;
    try {
      console.log("[블로그 생성] GPT 콘텐츠 생성 시작...");
      const allMenuData = await getAllMenuData();
      // 해당 날짜 범위의 메뉴 데이터만 필터링
      const relevantMenuData = allMenuData.filter(
        (menu) => menu.date_range === dateRange
      );

      if (relevantMenuData.length > 0) {
        gptContent = await generateBlogContent({
          menuDataList: relevantMenuData,
          day: day,
          koreanDate: dateInfo.koreanDate,
          apiKey: process.env.OPENAI_API_KEY,
          newsData: newsData, // 뉴스 데이터 주입
        });
        console.log("[블로그 생성] GPT 콘텐츠 생성 완료");
      } else {
        console.log(
          "[블로그 생성] 해당 날짜 범위의 메뉴 데이터가 없어 GPT 콘텐츠 생성 건너뜀"
        );
      }
    } catch (gptError) {
      console.warn(
        "[블로그 생성] GPT 콘텐츠 생성 실패, 기본 콘텐츠로 진행:",
        gptError.message
      );
      // GPT 오류는 치명적이지 않으므로 계속 진행
    }

    // Jekyll 블로그 포스트 생성
    let postPath;
    try {
      postPath = generateJekyllPost({
        dateString: dateInfo.dateString,
        koreanDate: dateInfo.koreanDate,
        day: day,
        imagePath: imageRelativePath,
        postsDir: postsDir,
        gptContent: gptContent,
      });
      console.log("[블로그 생성] Jekyll 포스트 생성 완료:", postPath);
    } catch (postError) {
      console.error("[블로그 생성] Jekyll 포스트 생성 실패:", postError);
      throw new Error(`블로그 포스트 생성 실패: ${postError.message}`);
    }

    // 티스토리 HTML 포스트 생성
    let tistoryPath;
    try {
      tistoryPath = generateTistoryPost({
        dateString: dateInfo.dateString,
        koreanDate: dateInfo.koreanDate,
        imagePath: imageRelativePath,
        postsDir: postsDir,
        gptContent: gptContent,
      });
      console.log("[블로그 생성] 티스토리 HTML 생성 완료:", tistoryPath);
    } catch (tistoryError) {
      console.warn(
        "[블로그 생성] 티스토리 HTML 생성 실패 (계속 진행):",
        tistoryError.message
      );
      // 티스토리 생성 실패해도 계속 진행
    }

    const responseData = {
      success: true,
      postPath: path.relative(path.join(__dirname, ".."), postPath),
      tistoryPath: tistoryPath
        ? path.relative(path.join(__dirname, ".."), tistoryPath)
        : null,
      imagePath: path.relative(path.join(__dirname, ".."), screenshotPath),
      dateInfo: dateInfo,
    };

    console.log("[블로그 생성] 응답 데이터:", responseData);
    res.setHeader("Content-Type", "application/json");
    res.json(responseData);
  } catch (error) {
    console.error("[블로그 생성] 전체 오류:", error);
    console.error("[블로그 생성] 스택 트레이스:", error.stack);

    const errorResponse = {
      error: "블로그 생성 중 오류가 발생했습니다.",
      message: error.message,
    };

    if (process.env.NODE_ENV === "development") {
      errorResponse.stack = error.stack;
    }

    res.setHeader("Content-Type", "application/json");
    res.status(500).json(errorResponse);
  } finally {
    // 브라우저 정리
    if (browser) {
      try {
        await browser.close();
        console.log("[블로그 생성] 브라우저 종료 완료");
      } catch (closeError) {
        console.error("[블로그 생성] 브라우저 종료 실패:", closeError);
      }
    }
  }
});

// 저장된 데이터 조회 엔드포인트 (기존 호환성 유지)
app.get("/api/data", async (req, res) => {
  try {
    const data = loadMenuData();
    res.json(data);
  } catch (error) {
    console.error("데이터 조회 오류:", error);
    res.status(500).json({
      error: "데이터 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 날짜 범위 관리 API ====================

// 날짜 범위 목록 조회
app.get("/api/date-ranges", async (req, res) => {
  try {
    const { active_only } = req.query;
    const dateRanges =
      active_only === "true" ? await getActiveDateRanges() : await getAllDateRanges();
    res.json(dateRanges);
  } catch (error) {
    console.error("날짜 범위 목록 조회 오류:", error);
    res.status(500).json({
      error: "날짜 범위 목록을 불러오는 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 날짜 범위 추가
app.post("/api/date-ranges", async (req, res) => {
  try {
    const { date_range, year, week } = req.body;
    if (!date_range || year === undefined || week === undefined) {
      return res.status(400).json({
        error: "date_range, year, week는 필수입니다.",
      });
    }

    const newDateRange = await addDateRange({
      date_range,
      year,
      week,
    });
    res.json(newDateRange);
  } catch (error) {
    console.error("날짜 범위 추가 오류:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "이미 존재하는 날짜 범위입니다." });
    }
    res
      .status(500)
      .json({ error: "날짜 범위를 추가하는 중 오류가 발생했습니다." });
  }
});

// 날짜 범위 수정
app.put("/api/date-ranges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "유효하지 않은 ID입니다." });
    }

    const result = await updateDateRange(id, req.body);
    if (result.changes === 0) {
      return res.status(404).json({ error: "날짜 범위를 찾을 수 없습니다." });
    }
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error("날짜 범위 수정 오류:", error);
    res
      .status(500)
      .json({ error: "날짜 범위를 수정하는 중 오류가 발생했습니다." });
  }
});

// 날짜 범위 삭제
app.delete("/api/date-ranges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "유효하지 않은 ID입니다." });
    }

    const result = await deleteDateRange(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "날짜 범위를 찾을 수 없습니다." });
    }
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error("날짜 범위 삭제 오류:", error);
    res
      .status(500)
      .json({ error: "날짜 범위를 삭제하는 중 오류가 발생했습니다." });
  }
});

// Health check
app.get("/api/health", async (req, res) => {
  res.json({ status: "ok" });
});

// ==================== 민원 관련 API ====================

// 민원 제출
app.post("/api/complaints", async (req, res) => {
  try {
    const {
      restaurant_name,
      date_range,
      category,
      title,
      content,
      user_name,
      user_email,
    } = req.body;

    // 필수 필드 검증
    if (
      !restaurant_name ||
      !category ||
      !title ||
      !content ||
      !user_name ||
      !user_email
    ) {
      return res.status(400).json({
        error:
          "필수 필드가 누락되었습니다. (restaurant_name, category, title, content, user_name, user_email)",
      });
    }

    // 카테고리 검증
    const validCategories = ["메뉴", "가격", "품질", "기타"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `유효하지 않은 카테고리입니다. 가능한 값: ${validCategories.join(
          ", "
        )}`,
      });
    }

    // Supabase에 민원 저장
    const { data, error } = await supabase
      .from("centumbob_complaints")
      .insert([
        {
          restaurant_name,
          date_range: date_range || null,
          category,
          title,
          content,
          user_name,
          user_email,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "민원 제출 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "민원이 성공적으로 제출되었습니다.",
      data,
    });
  } catch (error) {
    console.error("민원 제출 오류:", error);
    res.status(500).json({
      error: "민원 제출 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 민원 목록 조회
app.get("/api/complaints", async (req, res) => {
  try {
    const {
      status,
      restaurant_name,
      user_email,
      limit = 100,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("centumbob_complaints")
      .select("*")
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // 필터링
    if (status) {
      query = query.eq("status", status);
    }
    if (restaurant_name) {
      query = query.eq("restaurant_name", restaurant_name);
    }
    if (user_email) {
      query = query.eq("user_email", user_email);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "민원 조회 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("민원 조회 오류:", error);
    res.status(500).json({
      error: "민원 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 특정 민원 상세 조회
app.get("/api/complaints/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 먼저 조회
    const { data: complaint, error: fetchError } = await supabase
      .from("centumbob_complaints")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          error: "민원을 찾을 수 없습니다.",
        });
      }
      console.error("Supabase 오류:", fetchError);
      return res.status(500).json({
        error: "민원 조회 중 오류가 발생했습니다.",
        message: fetchError.message,
      });
    }

    // 읽지 않은 상태면 읽음으로 변경
    if (!complaint.is_read) {
      const { error: updateError } = await supabase
        .from("centumbob_complaints")
        .update({ is_read: true })
        .eq("id", id);

      if (updateError) {
        console.error("읽음 상태 업데이트 오류:", updateError);
      } else {
        complaint.is_read = true;
      }
    }

    res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error("민원 조회 오류:", error);
    res.status(500).json({
      error: "민원 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 민원 업데이트 (상태 변경 및 답변 작성)
app.put("/api/complaints/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response, is_read } = req.body;

    // 업데이트할 필드 구성
    const updateData = {};
    if (status) {
      const validStatuses = ["pending", "processing", "resolved", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(
            ", "
          )}`,
        });
      }
      updateData.status = status;
    }
    if (admin_response !== undefined) {
      updateData.admin_response = admin_response;
    }
    if (is_read !== undefined) {
      updateData.is_read = is_read;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "업데이트할 필드가 없습니다.",
      });
    }

    const { data, error } = await supabase
      .from("centumbob_complaints")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "민원을 찾을 수 없습니다.",
        });
      }
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "민원 업데이트 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "민원이 성공적으로 업데이트되었습니다.",
      data,
    });
  } catch (error) {
    console.error("민원 업데이트 오류:", error);
    res.status(500).json({
      error: "민원 업데이트 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 광고문의 관련 API ====================

// 광고문의 제출
app.post("/api/ad-inquiries", async (req, res) => {
  try {
    const {
      company_name,
      contact_name,
      email,
      phone,
      ad_type,
      description,
    } = req.body;

    // 필수 필드 검증
    if (
      !company_name ||
      !contact_name ||
      !email ||
      !phone ||
      !ad_type ||
      !description
    ) {
      return res.status(400).json({
        error:
          "필수 필드가 누락되었습니다. (company_name, contact_name, email, phone, ad_type, description)",
      });
    }

    // 광고 유형 검증
    const validAdTypes = ["배너", "협찬", "팝업", "기타"];
    if (!validAdTypes.includes(ad_type)) {
      return res.status(400).json({
        error: `유효하지 않은 광고 유형입니다. 가능한 값: ${validAdTypes.join(
          ", "
        )}`,
      });
    }

    // Supabase에 광고문의 저장
    const { data, error } = await supabase
      .from("centumbob_ad_inquiries")
      .insert([
        {
          company_name,
          contact_name,
          email,
          phone,
          ad_type,
          description,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "광고문의 제출 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "광고문의가 성공적으로 제출되었습니다.",
      data,
    });
  } catch (error) {
    console.error("광고문의 제출 오류:", error);
    res.status(500).json({
      error: "광고문의 제출 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 광고문의 목록 조회
app.get("/api/ad-inquiries", async (req, res) => {
  try {
    const {
      status,
      email,
      is_read,
      limit = 100,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("centumbob_ad_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // 필터링
    if (status) {
      query = query.eq("status", status);
    }
    if (email) {
      query = query.eq("email", email);
    }
    if (is_read !== undefined) {
      query = query.eq("is_read", is_read === "true");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "광고문의 조회 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("광고문의 조회 오류:", error);
    res.status(500).json({
      error: "광고문의 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 특정 광고문의 상세 조회
app.get("/api/ad-inquiries/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 먼저 조회
    const { data: inquiry, error: fetchError } = await supabase
      .from("centumbob_ad_inquiries")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          error: "광고문의를 찾을 수 없습니다.",
        });
      }
      console.error("Supabase 오류:", fetchError);
      return res.status(500).json({
        error: "광고문의 조회 중 오류가 발생했습니다.",
        message: fetchError.message,
      });
    }

    // 읽지 않은 상태면 읽음으로 변경
    if (!inquiry.is_read) {
      const { error: updateError } = await supabase
        .from("centumbob_ad_inquiries")
        .update({ is_read: true })
        .eq("id", id);

      if (updateError) {
        console.error("읽음 상태 업데이트 오류:", updateError);
      } else {
        inquiry.is_read = true;
      }
    }

    res.json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("광고문의 조회 오류:", error);
    res.status(500).json({
      error: "광고문의 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 광고문의 업데이트 (상태 변경 및 답변 작성)
app.put("/api/ad-inquiries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response, is_read } = req.body;

    // 업데이트할 필드 구성
    const updateData = {};
    if (status) {
      const validStatuses = ["pending", "processing", "resolved", "closed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(
            ", "
          )}`,
        });
      }
      updateData.status = status;
    }
    if (admin_response !== undefined) {
      updateData.admin_response = admin_response;
    }
    if (is_read !== undefined) {
      updateData.is_read = is_read;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "업데이트할 필드가 없습니다.",
      });
    }

    const { data, error } = await supabase
      .from("centumbob_ad_inquiries")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "광고문의를 찾을 수 없습니다.",
        });
      }
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "광고문의 업데이트 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "광고문의가 성공적으로 업데이트되었습니다.",
      data,
    });
  } catch (error) {
    console.error("광고문의 업데이트 오류:", error);
    res.status(500).json({
      error: "광고문의 업데이트 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 관리자 대시보드 API ====================

// 대시보드 요약 정보
app.get("/api/admin/dashboard-summary", async (req, res) => {
  try {
    // 민원 통계
    const { data: allComplaints, error: complaintsError } = await supabase
      .from("centumbob_complaints")
      .select("id, status, is_read");

    if (complaintsError) throw complaintsError;

    const complaintsStats = {
      total: allComplaints?.length || 0,
      // 해결됨/종료 상태는 읽지않음 알림에서 제외
      unread: allComplaints?.filter((c) => !c.is_read && c.status !== 'resolved' && c.status !== 'closed').length || 0,
      by_status: {
        pending: allComplaints?.filter((c) => c.status === "pending").length || 0,
        processing: allComplaints?.filter((c) => c.status === "processing").length || 0,
        resolved: allComplaints?.filter((c) => c.status === "resolved").length || 0,
        closed: allComplaints?.filter((c) => c.status === "closed").length || 0,
      },
    };

    // 광고문의 통계
    const { data: allAdInquiries, error: adInquiriesError } = await supabase
      .from("centumbob_ad_inquiries")
      .select("id, status, is_read");

    if (adInquiriesError) throw adInquiriesError;

    const adInquiriesStats = {
      total: allAdInquiries?.length || 0,
      // 해결됨/종료 상태는 읽지않음 알림에서 제외
      unread: allAdInquiries?.filter((a) => !a.is_read && a.status !== 'resolved' && a.status !== 'closed').length || 0,
      by_status: {
        pending: allAdInquiries?.filter((a) => a.status === "pending").length || 0,
        processing: allAdInquiries?.filter((a) => a.status === "processing").length || 0,
        resolved: allAdInquiries?.filter((a) => a.status === "resolved").length || 0,
        closed: allAdInquiries?.filter((a) => a.status === "closed").length || 0,
      },
    };

    // 채팅 메시지 통계 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentMessages, error: messagesError } = await supabase
      .from("centumbob_chat_messages")
      .select("id")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (messagesError && messagesError.code !== "42P01") {
      // 테이블이 없는 경우 무시
      console.error("채팅 메시지 조회 오류:", messagesError);
    }

    const chatStats = {
      recent_7days: recentMessages?.length || 0,
    };

    // 블랙리스트 통계
    const { data: blacklistData, error: blacklistError } = await supabase
      .from("centumbob_chat_blacklist")
      .select("id")
      .eq("is_active", true);

    if (blacklistError && blacklistError.code !== "42P01") {
      console.error("블랙리스트 조회 오류:", blacklistError);
    }

    const blacklistStats = {
      total: blacklistData?.length || 0,
    };

    // 식당 수
    const restaurants = await getAllRestaurants();
    const restaurantsStats = {
      total: restaurants?.length || 0,
    };

    res.json({
      success: true,
      data: {
        complaints: complaintsStats,
        ad_inquiries: adInquiriesStats,
        chat_messages: chatStats,
        blacklist: blacklistStats,
        restaurants: restaurantsStats,
      },
    });
  } catch (error) {
    console.error("대시보드 요약 조회 오류:", error);
    res.status(500).json({
      error: "대시보드 요약 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 채팅 메시지 모니터링
app.get("/api/admin/chat-messages", async (req, res) => {
  try {
    const {
      days = 7,
      channel,
      limit = 50,
      offset = 0,
    } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    let query = supabase
      .from("centumbob_chat_messages")
      .select("*")
      .gte("created_at", daysAgo.toISOString())
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (channel && channel !== "전체") {
      query = query.eq("channel", channel);
    }

    const { data, error } = await query;

    if (error) {
      // 테이블이 없는 경우
      if (error.code === "42P01") {
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: "채팅 메시지 테이블이 존재하지 않습니다.",
        });
      }
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "채팅 메시지 조회 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("채팅 메시지 조회 오류:", error);
    res.status(500).json({
      error: "채팅 메시지 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 채팅 블랙리스트 관리 API ====================

// 블랙리스트 목록 조회
app.get("/api/admin/blacklist", async (req, res) => {
  try {
    const { is_active, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from("centumbob_chat_blacklist")
      .select("*")
      .order("created_at", { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active === "true");
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: "블랙리스트 테이블이 존재하지 않습니다.",
        });
      }
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "블랙리스트 조회 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("블랙리스트 조회 오류:", error);
    res.status(500).json({
      error: "블랙리스트 조회 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 블랙리스트 추가
app.post("/api/admin/blacklist", async (req, res) => {
  try {
    const { ip_address, anonymous_id, user_id, reason, blocked_by, expires_at, notes } = req.body;

    // 최소한 하나의 식별자는 필요
    if (!ip_address && !anonymous_id && !user_id) {
      return res.status(400).json({
        error: "IP 주소, 익명 ID, 또는 사용자 ID 중 하나 이상이 필요합니다.",
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: "차단 사유가 필요합니다.",
      });
    }

    const blacklistData = {
      ip_address: ip_address || null,
      anonymous_id: anonymous_id || null,
      user_id: user_id || null,
      reason,
      blocked_by: blocked_by || "admin",
      expires_at: expires_at || null,
      notes: notes || null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("centumbob_chat_blacklist")
      .insert([blacklistData])
      .select()
      .single();

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "블랙리스트 추가 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data,
      message: "블랙리스트에 추가되었습니다.",
    });
  } catch (error) {
    console.error("블랙리스트 추가 오류:", error);
    res.status(500).json({
      error: "블랙리스트 추가 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 블랙리스트 업데이트
app.put("/api/admin/blacklist/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, reason, expires_at, notes } = req.body;

    const updateData = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (reason !== undefined) updateData.reason = reason;
    if (expires_at !== undefined) updateData.expires_at = expires_at;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from("centumbob_chat_blacklist")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "블랙리스트 업데이트 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      data,
      message: "블랙리스트가 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("블랙리스트 업데이트 오류:", error);
    res.status(500).json({
      error: "블랙리스트 업데이트 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 블랙리스트 삭제
app.delete("/api/admin/blacklist/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("centumbob_chat_blacklist")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "블랙리스트 삭제 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "블랙리스트에서 삭제되었습니다.",
    });
  } catch (error) {
    console.error("블랙리스트 삭제 오류:", error);
    res.status(500).json({
      error: "블랙리스트 삭제 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 블랙리스트 체크 (특정 IP/익명ID/사용자ID가 차단되었는지 확인)
app.post("/api/chat/check-blacklist", async (req, res) => {
  try {
    const { ip_address, anonymous_id, user_id } = req.body;

    let query = supabase
      .from("centumbob_chat_blacklist")
      .select("*")
      .eq("is_active", true);

    // 현재 시간보다 이전에 만료된 항목 제외
    query = query.or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    // IP, 익명ID, 사용자ID 중 하나라도 일치하면 차단
    const conditions = [];
    if (ip_address) conditions.push(`ip_address.eq.${ip_address}`);
    if (anonymous_id) conditions.push(`anonymous_id.eq.${anonymous_id}`);
    if (user_id) conditions.push(`user_id.eq.${user_id}`);

    if (conditions.length > 0) {
      query = query.or(conditions.join(","));
    }

    const { data, error } = await query;

    if (error && error.code !== "42P01") {
      console.error("Supabase 오류:", error);
      return res.status(500).json({
        error: "블랙리스트 확인 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    const isBlocked = data && data.length > 0;

    res.json({
      success: true,
      blocked: isBlocked,
      data: isBlocked ? data[0] : null,
    });
  } catch (error) {
    console.error("블랙리스트 확인 오류:", error);
    res.status(500).json({
      error: "블랙리스트 확인 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 웹훅 이미지 가져오기 API ====================

app.post("/api/webhook/fetch-image", async (req, res) => {
  try {
    const { webhook_url, restaurant_name } = req.body;

    // 필수 파라미터 검증
    if (!webhook_url) {
      return res.status(400).json({
        error: "웹훅 URL이 필요합니다.",
      });
    }

    // URL 형식 검증
    try {
      new URL(webhook_url);
    } catch (urlError) {
      return res.status(400).json({
        error: "잘못된 URL 형식입니다.",
      });
    }

    console.log(
      `[웹훅] 이미지 가져오기 시작: ${webhook_url} (${
        restaurant_name || "unknown"
      })`
    );

    // 웹훅 호출 (타임아웃 30초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(webhook_url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "image/*",
        },
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return res.status(504).json({
          error: "웹훅 요청 시간 초과 (30초)",
        });
      }
      console.error("[웹훅] 요청 실패:", fetchError);
      return res.status(502).json({
        error: "웹훅 서버에 연결할 수 없습니다.",
        message: fetchError.message,
      });
    }

    // 응답 상태 확인
    if (!response.ok) {
      console.error("[웹훅] 응답 오류:", response.status, response.statusText);
      return res.status(502).json({
        error: `웹훅 서버 오류: ${response.status} ${response.statusText}`,
      });
    }

    // Content-Type 확인
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.error("[웹훅] 잘못된 Content-Type:", contentType);
      return res.status(502).json({
        error: "웹훅 응답이 이미지가 아닙니다.",
        contentType: contentType,
      });
    }

    // 이미지 바이너리 데이터 가져오기
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // 이미지 크기 검증 (최대 10MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({
        error: "이미지 크기가 너무 큽니다. (최대 10MB)",
      });
    }

    // 파일 확장자 결정
    let extension = "jpg";
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("gif")) extension = "gif";
    else if (contentType.includes("webp")) extension = "webp";

    // Base64로 변환하여 반환
    const base64Image = imageBuffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    console.log(
      `[웹훅] 이미지 가져오기 성공: ${imageBuffer.length} bytes, ${contentType}`
    );

    res.json({
      success: true,
      imageData: dataUrl,
      contentType: contentType,
      size: imageBuffer.length,
      extension: extension,
    });
  } catch (error) {
    console.error("[웹훅] 전체 오류:", error);
    res.status(500).json({
      error: "웹훅 이미지 가져오기 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 웹훅 JSON 가져오기 API ====================

app.post("/api/webhook/fetch-json", async (req, res) => {
  try {
    const { webhook_url } = req.body;

    // 필수 파라미터 검증
    if (!webhook_url) {
      return res.status(400).json({
        error: "웹훅 URL이 필요합니다.",
      });
    }

    // URL 형식 검증
    try {
      new URL(webhook_url);
    } catch (urlError) {
      return res.status(400).json({
        error: "잘못된 URL 형식입니다.",
      });
    }

    console.log(`[웹훅 JSON] 데이터 가져오기 시작: ${webhook_url}`);

    // 웹훅 호출 (타임아웃 30초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(webhook_url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return res.status(504).json({
          error: "웹훅 요청 시간 초과 (30초)",
        });
      }
      console.error("[웹훅 JSON] 요청 실패:", fetchError);
      return res.status(502).json({
        error: "웹훅 서버에 연결할 수 없습니다.",
        message: fetchError.message,
      });
    }

    // 응답 상태 확인
    if (!response.ok) {
      console.error(
        "[웹훅 JSON] 응답 오류:",
        response.status,
        response.statusText
      );
      return res.status(502).json({
        error: `웹훅 서버 오류: ${response.status} ${response.statusText}`,
      });
    }

    // JSON 데이터 파싱
    let jsonData;
    try {
      jsonData = await response.json();
    } catch (parseError) {
      console.error("[웹훅 JSON] JSON 파싱 오류:", parseError);
      return res.status(502).json({
        error: "웹훅 응답을 JSON으로 파싱할 수 없습니다.",
        message: parseError.message,
      });
    }

    console.log(`[웹훅 JSON] 데이터 가져오기 성공`);

    res.json({
      success: true,
      data: jsonData,
    });
  } catch (error) {
    console.error("[웹훅 JSON] 전체 오류:", error);
    res.status(500).json({
      error: "웹훅 JSON 가져오기 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 웹훅 JSON 데이터 직접 업로드 API ====================

app.post("/api/webhook/upload-json-data", async (req, res) => {
  try {
    console.log("[웹훅 JSON 업로드] 받은 req.body:", JSON.stringify(req.body, null, 2));

    const { restaurant_id, weeklyMenu } = req.body;

    // 필수 파라미터 검증
    if (!restaurant_id || isNaN(parseInt(restaurant_id, 10))) {
      return res.status(400).json({
        error: "유효한 식당 ID가 필요합니다.",
      });
    }

    if (!weeklyMenu || typeof weeklyMenu !== 'object') {
      return res.status(400).json({
        error: "weeklyMenu 데이터가 필요합니다.",
      });
    }

    const restaurantIdNum = parseInt(restaurant_id, 10);

    console.log(`[웹훅 JSON 업로드] 시작: restaurant_id=${restaurantIdNum}`);

    // 활성 날짜 범위 조회
    const activeDateRanges = await getActiveDateRanges();
    if (activeDateRanges.length === 0) {
      return res.status(400).json({
        error: "활성화된 날짜 범위가 없습니다.",
      });
    }
    const activeDateRange = activeDateRanges[0].date_range;

    // 식당 정보 조회
    const restaurant = await getRestaurantById(restaurantIdNum);
    if (!restaurant) {
      return res.status(404).json({
        error: "해당 식당을 찾을 수 없습니다.",
      });
    }

    // 기존 메뉴 데이터 조회
    const existingData = await getMenuData(restaurantIdNum, activeDateRange);
    const existingMenus = existingData?.menus || {};

    // weeklyMenu 데이터를 데이터베이스 형식으로 변환
    // 입력: { "월": { "date": "1/27", "menuItems": [...] }, ... }
    // 출력: { "월": { "lunch": [...] }, ... }
    const transformedMenus = {};
    const validDays = ["월", "화", "수", "목", "금"];

    for (const day of validDays) {
      if (weeklyMenu[day] && Array.isArray(weeklyMenu[day].menuItems)) {
        // 기존 데이터 유지 (저녁 메뉴 보존)
        transformedMenus[day] = {
          lunch: weeklyMenu[day].menuItems.filter(item => item && item.trim()),
          dinner: existingMenus[day]?.dinner || [],
        };
      } else if (existingMenus[day]) {
        // 새 데이터가 없으면 기존 데이터 유지
        transformedMenus[day] = existingMenus[day];
      }
    }

    console.log(`[웹훅 JSON 업로드] 변환된 메뉴 데이터:`, JSON.stringify(transformedMenus, null, 2));

    // 데이터베이스에 저장
    await saveMenuData({
      restaurant_id: restaurantIdNum,
      date_range: activeDateRange,
      menus: transformedMenus,
      image_paths: existingData?.image_paths || {},
      excluded_menu_items: existingData?.excluded_menu_items || [],
    });

    console.log(`[웹훅 JSON 업로드] 성공: ${restaurant.name} - ${activeDateRange}`);

    res.json({
      success: true,
      message: "메뉴 데이터가 성공적으로 저장되었습니다.",
      data: {
        restaurant_id: restaurantIdNum,
        restaurant_name: restaurant.name,
        date_range: activeDateRange,
        updated_days: Object.keys(transformedMenus),
      },
    });
  } catch (error) {
    console.error("[웹훅 JSON 업로드] 오류:", error);
    res.status(500).json({
      error: "메뉴 데이터 저장 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 웹훅 URL에서 이미지 업로드 및 분석 API ====================

app.post("/api/webhook/upload-from-url", async (req, res) => {
  try {
    // 디버깅: 받은 데이터 로깅
    console.log("[웹훅 업로드] 받은 req.body:", JSON.stringify(req.body, null, 2));
    console.log("[웹훅 업로드] Content-Type:", req.headers['content-type']);

    const { image_url, restaurant_id, type, day_id } = req.body;

    // 필수 파라미터 검증
    if (!image_url) {
      return res.status(400).json({
        error: "이미지 URL이 필요합니다.",
      });
    }

    if (!restaurant_id || isNaN(parseInt(restaurant_id, 10))) {
      return res.status(400).json({
        error: "유효한 식당 ID가 필요합니다.",
      });
    }

    if (!type || !["전체요일", "개별요일"].includes(type)) {
      return res.status(400).json({
        error: '타입 구분이 필요합니다. ("전체요일" 또는 "개별요일")',
      });
    }

    if (type === "개별요일") {
      const validDays = ["월", "화", "수", "목", "금"];
      if (!day_id || !validDays.includes(day_id)) {
        return res.status(400).json({
          error: `개별요일 모드에서는 유효한 요일 ID가 필요합니다. (${validDays.join(", ")})`,
        });
      }
    }

    // URL 형식 검증
    try {
      new URL(image_url);
    } catch (urlError) {
      return res.status(400).json({
        error: "잘못된 URL 형식입니다.",
      });
    }

    const restaurantIdNum = parseInt(restaurant_id, 10);

    console.log(
      `[웹훅 업로드] 시작: restaurant_id=${restaurantIdNum}, type=${type}, day_id=${day_id || "N/A"}, url=${image_url}`
    );

    // 활성 날짜 범위 조회
    const activeDateRanges = await getActiveDateRanges();
    if (activeDateRanges.length === 0) {
      return res.status(400).json({
        error: "활성화된 날짜 범위가 없습니다.",
      });
    }
    const activeDateRange = activeDateRanges[0].date_range;

    // 식당 정보 조회 및 검증
    const restaurant = await getRestaurantById(restaurantIdNum);
    if (!restaurant) {
      return res.status(404).json({
        error: "식당을 찾을 수 없습니다.",
      });
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API 키가 설정되지 않았습니다.",
      });
    }

    // 이미지 다운로드
    console.log("[웹훅 업로드] 이미지 다운로드 중...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(image_url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "image/*",
        },
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return res.status(504).json({
          error: "이미지 다운로드 시간 초과 (30초)",
        });
      }
      console.error("[웹훅 업로드] 다운로드 실패:", fetchError);
      return res.status(502).json({
        error: "이미지를 다운로드할 수 없습니다.",
        message: fetchError.message,
      });
    }

    if (!response.ok) {
      console.error(
        "[웹훅 업로드] 다운로드 오류:",
        response.status,
        response.statusText
      );
      return res.status(502).json({
        error: `이미지 다운로드 오류: ${response.status} ${response.statusText}`,
      });
    }

    // Content-Type 확인
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.error("[웹훅 업로드] 잘못된 Content-Type:", contentType);
      return res.status(400).json({
        error: "URL이 이미지를 반환하지 않습니다.",
        contentType: contentType,
      });
    }

    // 이미지 버퍼로 변환
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // 이미지 크기 검증 (최대 10MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({
        error: "이미지 크기가 너무 큽니다. (최대 10MB)",
      });
    }

    // 이미지 형식 검증
    const validation = await validateImageBuffer(imageBuffer, contentType);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    console.log(
      `[웹훅 업로드] 이미지 다운로드 완료: ${imageBuffer.length} bytes`
    );

    // 파일 확장자 결정
    let extension = "jpg";
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("gif")) extension = "gif";
    else if (contentType.includes("webp")) extension = "webp";

    // 이미지를 base64로 변환
    const imageBase64 = imageBuffer.toString("base64");
    const imageDataUrl = `data:${contentType};base64,${imageBase64}`;

    // 1. Tesseract OCR로 텍스트 1차 추출
    console.log("[웹훅 업로드] OCR 분석 시작...");
    let ocrText = "";
    try {
      const worker = await createWorker("kor+eng");
      const ret = await worker.recognize(imageBuffer);
      ocrText = ret.data.text;
      await worker.terminate();
      console.log(
        "[웹훅 업로드] OCR 분석 완료 (텍스트 길이):",
        ocrText.length
      );
    } catch (ocrError) {
      console.warn(
        "[웹훅 업로드] OCR 분석 실패 (GPT Vision만 사용):",
        ocrError
      );
      // OCR 실패해도 계속 진행
    }

    // GPT API 호출 함수 (재시도 로직 포함)
    const callGPTAPI = async (retryCount = 0) => {
      try {
        // 개별요일 모드일 때 추가 지침
        const dayInfo = type === "개별요일"
          ? `\n[중요] 이 이미지는 "${day_id}" 요일의 메뉴입니다. 분석한 메뉴를 반드시 "${day_id}" 요일 필드에 넣어주세요.\n`
          : "";

        const response = await openai.chat.completions.create({
          model: "gpt-4o-2024-11-20",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `이 식단표 이미지를 정확하게 분석하여 다음 정보를 JSON 형식으로 추출해주세요.
${dayInfo}
[참고 정보]
다음은 이미지에서 OCR(광학 문자 인식)로 추출한 원본 텍스트입니다.
이미지가 흐릿하거나 글자가 잘 안 보일 때 이 텍스트를 참고하여 정확도를 높이세요.
단, OCR 텍스트는 구조가 깨져있을 수 있으므로 메뉴의 배치나 요일 확인은 반드시 이미지를 기준으로 하세요.

--- OCR 추출 텍스트 시작 ---
${ocrText}
--- OCR 추출 텍스트 끝 ---

중요 지침:
1. 이미지의 텍스트를 정확히 읽어야 합니다. 추측하지 마세요.
2. 메뉴명은 이미지에 표시된 그대로 정확히 추출하세요.
3. 가격 정보가 보이지 않으면 빈 문자열("")로 표시하세요.
4. 메뉴가 없는 요일/시간대는 빈 배열([])로 표시하세요.
5. 불확실한 정보는 포함하지 마세요.

추출할 정보:
1. 가격 정보:
   - lunch: 점심 가격 (예: "7,000원", "7000원", 가격이 없으면 "")
   - dinner: 저녁 가격 (예: "7,000원", "7000원", 가격이 없으면 "")

2. 메뉴 정보 (월요일부터 금요일까지):
   - 각 요일별로 점심(lunch)과 저녁(dinner) 메뉴를 배열로 추출
   - 메뉴명은 이미지에 표시된 정확한 텍스트를 사용
   - 각 메뉴는 별도의 배열 요소로 분리
   - 메뉴가 없는 경우 빈 배열([])로 표시

응답 형식 (반드시 이 형식을 정확히 따르세요):
{
  "price": {
    "lunch": "가격 또는 빈 문자열",
    "dinner": "가격 또는 빈 문자열"
  },
  "menus": {
    "월": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "화": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "수": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "목": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "금": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    }
  }
}

주의사항:
- 반드시 위 JSON 형식을 정확히 따라야 합니다.
- 다른 설명이나 주석 없이 순수한 JSON만 반환하세요.
- 메뉴가 없는 경우 빈 배열([])을 사용하세요.
- 가격이 없는 경우 빈 문자열("")을 사용하세요.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("GPT 응답이 비어 있습니다.");
        }

        return content;
      } catch (error) {
        if (error.status === 429 && retryCount < 3) {
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`[웹훅 업로드] Rate limit, ${waitTime}ms 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return callGPTAPI(retryCount + 1);
        }
        throw error;
      }
    };

    // 2. GPT-4o Vision으로 메뉴 데이터 추출
    console.log("[웹훅 업로드] GPT 분석 시작...");
    let gptResponse;
    try {
      gptResponse = await callGPTAPI();
      console.log("[웹훅 업로드] GPT 분석 완료");
    } catch (error) {
      console.error("[웹훅 업로드] GPT API 오류:", error);
      return res.status(500).json({
        error: "메뉴 분석 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    // JSON 파싱
    let menuData;
    try {
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("GPT 응답에서 JSON을 찾을 수 없습니다.");
      }
      menuData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[웹훅 업로드] JSON 파싱 오류:", parseError);
      console.error("GPT 응답:", gptResponse);
      return res.status(500).json({
        error: "GPT 응답을 파싱할 수 없습니다.",
        gptResponse: gptResponse,
      });
    }

    // 3. 이미지 저장 (일반 업로드와 동일한 구조 사용)
    const timestamp = Date.now();
    const filename = `${restaurant.name}_${activeDateRange}_${timestamp}.${extension}`;

    // 디렉토리 구조: uploads/{restaurant}/{dateRange}/
    const safeRestaurant = restaurant.name.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    const safeDateRange = activeDateRange.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    const destDir = path.join(uploadsDir, safeRestaurant, safeDateRange);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, filename);
    fs.writeFileSync(destPath, imageBuffer);

    // 상대 경로 생성 (프론트엔드에서 사용)
    const relativePath = path.relative(__dirname, destPath);
    const imagePath = relativePath.split(path.sep).join("/");

    console.log(`[웹훅 업로드] 이미지 저장 완료: ${imagePath}`);

    // 4. 기존 데이터 조회
    const existingData = await getMenuData(restaurantIdNum, activeDateRange);

    let finalMenus = existingData?.menus || {
      월: { lunch: [], dinner: [] },
      화: { lunch: [], dinner: [] },
      수: { lunch: [], dinner: [] },
      목: { lunch: [], dinner: [] },
      금: { lunch: [], dinner: [] },
    };

    let finalImagePaths = existingData?.image_paths || {};

    // 5. 데이터 병합 로직
    if (type === "전체요일") {
      // 전체 요일 덮어쓰기
      finalMenus = menuData.menus;
      finalImagePaths = {
        월: imagePath,
        화: imagePath,
        수: imagePath,
        목: imagePath,
        금: imagePath,
      };
    } else if (type === "개별요일") {
      // 개별 요일만 업데이트
      // GPT가 어떤 요일에 메뉴를 넣었는지 찾기 (실제로 메뉴가 있는 첫 번째 요일)
      let extractedMenuData = null;
      const dayOrder = ["월", "화", "수", "목", "금"];

      for (const day of dayOrder) {
        if (menuData.menus[day]) {
          const hasLunch = menuData.menus[day].lunch?.length > 0;
          const hasDinner = menuData.menus[day].dinner?.length > 0;
          if (hasLunch || hasDinner) {
            extractedMenuData = menuData.menus[day];
            console.log(`[웹훅 업로드] GPT가 분석한 요일: ${day}, 지정된 요일: ${day_id}`);
            break;
          }
        }
      }

      if (extractedMenuData) {
        finalMenus[day_id] = extractedMenuData;
        finalImagePaths[day_id] = imagePath;
        console.log(`[웹훅 업로드] ${day_id} 요일에 메뉴 저장 완료`);
      } else {
        console.warn(`[웹훅 업로드] GPT 분석 결과에 유효한 메뉴가 없습니다.`);
      }
    }

    // 6. 데이터베이스 저장
    const savedData = {
      restaurant_id: restaurantIdNum,
      date_range: activeDateRange,
      price_lunch: menuData.price?.lunch || "",
      price_dinner: menuData.price?.dinner || "",
      menus: finalMenus,
      image_paths: finalImagePaths,
      excluded_menu_items: existingData?.excluded_menu_items || [],
    };

    await saveMenuData(savedData);

    console.log(
      `[웹훅 업로드] 저장 완료: restaurant_id=${restaurantIdNum}, date_range=${activeDateRange}`
    );

    res.json({
      success: true,
      message: "메뉴가 성공적으로 업로드되었습니다.",
      data: {
        restaurant_id: restaurantIdNum,
        restaurant_name: restaurant.name,
        date_range: activeDateRange,
        type: type,
        day_id: day_id || null,
        extracted_data: menuData,
        saved_image: imagePath,
      },
    });
  } catch (error) {
    console.error("[웹훅 업로드] 전체 오류:", error);
    res.status(500).json({
      error: "메뉴 업로드 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 바이너리 이미지 업로드 (n8n용)
app.post("/api/webhook/upload-binary", upload.single("image"), async (req, res) => {
  try {
    // 파라미터 추출
    const { restaurant_id, type, day_id } = req.body;

    console.log("[웹훅 바이너리] 받은 파라미터:", { restaurant_id, type, day_id });
    console.log("[웹훅 바이너리] 파일 정보:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : "없음");

    // 필수 파라미터 검증
    if (!req.file) {
      return res.status(400).json({
        error: "이미지 파일이 필요합니다.",
      });
    }

    if (!restaurant_id || isNaN(parseInt(restaurant_id, 10))) {
      return res.status(400).json({
        error: "유효한 식당 ID가 필요합니다.",
      });
    }

    if (!type || !["전체요일", "개별요일"].includes(type)) {
      return res.status(400).json({
        error: '타입 구분이 필요합니다. ("전체요일" 또는 "개별요일")',
      });
    }

    if (type === "개별요일") {
      const validDays = ["월", "화", "수", "목", "금"];
      if (!day_id || !validDays.includes(day_id)) {
        return res.status(400).json({
          error: `개별요일 모드에서는 유효한 요일 ID가 필요합니다. (${validDays.join(", ")})`,
        });
      }
    }

    const restaurantIdNum = parseInt(restaurant_id, 10);

    console.log(
      `[웹훅 바이너리] 시작: restaurant_id=${restaurantIdNum}, type=${type}, day_id=${day_id || "N/A"}`
    );

    // 활성 날짜 범위 조회
    const activeDateRanges = await getActiveDateRanges();
    if (activeDateRanges.length === 0) {
      return res.status(400).json({
        error: "활성화된 날짜 범위가 없습니다.",
      });
    }
    const activeDateRange = activeDateRanges[0].date_range;

    // 식당 정보 조회 및 검증
    const restaurant = await getRestaurantById(restaurantIdNum);
    if (!restaurant) {
      return res.status(404).json({
        error: "식당을 찾을 수 없습니다.",
      });
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API 키가 설정되지 않았습니다.",
      });
    }

    // 이미지를 base64로 변환
    const imageBuffer = req.file.buffer;
    const imageBase64 = imageBuffer.toString("base64");
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // 1. Tesseract OCR로 텍스트 1차 추출
    console.log("[웹훅 바이너리] OCR 분석 시작...");
    let ocrText = "";
    try {
      const worker = await createWorker("kor+eng");
      const ret = await worker.recognize(imageBuffer);
      ocrText = ret.data.text;
      await worker.terminate();
      console.log(
        "[웹훅 바이너리] OCR 분석 완료 (텍스트 길이):",
        ocrText.length
      );
    } catch (ocrError) {
      console.warn(
        "[웹훅 바이너리] OCR 분석 실패 (GPT Vision만 사용):",
        ocrError
      );
      // OCR 실패해도 계속 진행
    }

    // GPT API 호출 함수 (재시도 로직 포함)
    const callGPTAPI = async (retryCount = 0) => {
      try {
        // 개별요일 모드일 때 추가 지침
        const dayInfo = type === "개별요일"
          ? `\n[중요] 이 이미지는 "${day_id}" 요일의 메뉴입니다. 분석한 메뉴를 반드시 "${day_id}" 요일 필드에 넣어주세요.\n`
          : "";

        const response = await openai.chat.completions.create({
          model: "gpt-4o-2024-11-20",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `이 식단표 이미지를 정확하게 분석하여 다음 정보를 JSON 형식으로 추출해주세요.
${dayInfo}
[참고 정보]
다음은 이미지에서 OCR(광학 문자 인식)로 추출한 원본 텍스트입니다.
이미지가 흐릿하거나 글자가 잘 안 보일 때 이 텍스트를 참고하여 정확도를 높이세요.
단, OCR 텍스트는 구조가 깨져있을 수 있으므로 메뉴의 배치나 요일 확인은 반드시 이미지를 기준으로 하세요.

--- OCR 추출 텍스트 시작 ---
${ocrText}
--- OCR 추출 텍스트 끝 ---

중요 지침:
1. 이미지의 텍스트를 정확히 읽어야 합니다. 추측하지 마세요.
2. 메뉴명은 이미지에 표시된 그대로 정확히 추출하세요.
3. 가격 정보가 보이지 않으면 빈 문자열("")로 표시하세요.
4. 메뉴가 없는 요일/시간대는 빈 배열([])로 표시하세요.
5. 불확실한 정보는 포함하지 마세요.

추출할 정보:
1. 가격 정보:
   - lunch: 점심 가격 (예: "7,000원", "7000원", 가격이 없으면 "")
   - dinner: 저녁 가격 (예: "7,000원", "7000원", 가격이 없으면 "")

2. 메뉴 정보 (월요일부터 금요일까지):
   - 각 요일별로 점심(lunch)과 저녁(dinner) 메뉴를 배열로 추출
   - 메뉴명은 이미지에 표시된 정확한 텍스트를 사용
   - 각 메뉴는 별도의 배열 요소로 분리
   - 메뉴가 없는 경우 빈 배열([])로 표시

응답 형식 (반드시 이 형식을 정확히 따르세요):
{
  "price": {
    "lunch": "가격 또는 빈 문자열",
    "dinner": "가격 또는 빈 문자열"
  },
  "menus": {
    "월": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "화": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "수": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "목": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    },
    "금": {
      "lunch": ["메뉴1", "메뉴2"],
      "dinner": ["메뉴1", "메뉴2"]
    }
  }
}

주의사항:
- 반드시 위 JSON 형식을 정확히 따라야 합니다.
- 다른 설명이나 주석 없이 순수한 JSON만 반환하세요.
- 메뉴가 없는 경우 빈 배열([])을 사용하세요.
- 가격이 없는 경우 빈 문자열("")을 사용하세요.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("GPT 응답이 비어 있습니다.");
        }

        return content;
      } catch (error) {
        if (error.status === 429 && retryCount < 3) {
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`[웹훅 바이너리] Rate limit, ${waitTime}ms 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return callGPTAPI(retryCount + 1);
        }
        throw error;
      }
    };

    // 2. GPT-4o Vision으로 메뉴 데이터 추출
    console.log("[웹훅 바이너리] GPT 분석 시작...");
    let gptResponse;
    try {
      gptResponse = await callGPTAPI();
      console.log("[웹훅 바이너리] GPT 분석 완료");
    } catch (error) {
      console.error("[웹훅 바이너리] GPT API 오류:", error);
      return res.status(500).json({
        error: "메뉴 분석 중 오류가 발생했습니다.",
        message: error.message,
      });
    }

    // JSON 파싱
    let menuData;
    try {
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("GPT 응답에서 JSON을 찾을 수 없습니다.");
      }
      menuData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[웹훅 바이너리] JSON 파싱 오류:", parseError);
      console.error("GPT 응답:", gptResponse);
      return res.status(500).json({
        error: "GPT 응답을 파싱할 수 없습니다.",
        gptResponse: gptResponse,
      });
    }

    // 3. 이미지 저장 (일반 업로드와 동일한 구조 사용)
    const timestamp = Date.now();
    const fileExt = path.extname(req.file.originalname) || ".jpg";
    const filename = `${restaurant.name}_${activeDateRange}_${timestamp}${fileExt}`;

    // 디렉토리 구조: uploads/{restaurant}/{dateRange}/
    const safeRestaurant = restaurant.name.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    const safeDateRange = activeDateRange.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    const destDir = path.join(uploadsDir, safeRestaurant, safeDateRange);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, filename);
    fs.writeFileSync(destPath, imageBuffer);

    // 상대 경로 생성 (프론트엔드에서 사용)
    const relativePath = path.relative(__dirname, destPath);
    const imagePath = relativePath.split(path.sep).join("/");

    console.log(`[웹훅 바이너리] 이미지 저장 완료: ${imagePath}`);

    // 4. 기존 데이터 조회
    const existingData = await getMenuData(restaurantIdNum, activeDateRange);

    let finalMenus = existingData?.menus || {
      월: { lunch: [], dinner: [] },
      화: { lunch: [], dinner: [] },
      수: { lunch: [], dinner: [] },
      목: { lunch: [], dinner: [] },
      금: { lunch: [], dinner: [] },
    };

    let finalImagePaths = existingData?.image_paths || {};

    // 5. 데이터 병합 로직
    if (type === "전체요일") {
      // 전체 요일 덮어쓰기
      finalMenus = menuData.menus;
      finalImagePaths = {
        월: imagePath,
        화: imagePath,
        수: imagePath,
        목: imagePath,
        금: imagePath,
      };
    } else if (type === "개별요일") {
      // 개별 요일만 업데이트
      // GPT가 어떤 요일에 메뉴를 넣었는지 찾기 (실제로 메뉴가 있는 첫 번째 요일)
      let extractedMenuData = null;
      const dayOrder = ["월", "화", "수", "목", "금"];

      for (const day of dayOrder) {
        if (menuData.menus[day]) {
          const hasLunch = menuData.menus[day].lunch?.length > 0;
          const hasDinner = menuData.menus[day].dinner?.length > 0;
          if (hasLunch || hasDinner) {
            extractedMenuData = menuData.menus[day];
            console.log(`[웹훅 바이너리] GPT가 분석한 요일: ${day}, 지정된 요일: ${day_id}`);
            break;
          }
        }
      }

      if (extractedMenuData) {
        finalMenus[day_id] = extractedMenuData;
        finalImagePaths[day_id] = imagePath;
        console.log(`[웹훅 바이너리] ${day_id} 요일에 메뉴 저장 완료`);
      } else {
        console.warn(`[웹훅 바이너리] GPT 분석 결과에 유효한 메뉴가 없습니다.`);
      }
    }

    // 6. 데이터베이스 저장
    const savedData = {
      restaurant_id: restaurantIdNum,
      date_range: activeDateRange,
      price_lunch: menuData.price?.lunch || "",
      price_dinner: menuData.price?.dinner || "",
      menus: finalMenus,
      image_paths: finalImagePaths,
      excluded_menu_items: existingData?.excluded_menu_items || [],
    };

    await saveMenuData(savedData);

    console.log(
      `[웹훅 바이너리] 저장 완료: restaurant_id=${restaurantIdNum}, date_range=${activeDateRange}`
    );

    res.json({
      success: true,
      message: "메뉴가 성공적으로 업로드되었습니다.",
      data: {
        restaurant_id: restaurantIdNum,
        restaurant_name: restaurant.name,
        date_range: activeDateRange,
        type: type,
        day_id: day_id || null,
        extracted_data: menuData,
        saved_image: imagePath,
      },
    });
  } catch (error) {
    console.error("[웹훅 바이너리] 전체 오류:", error);
    res.status(500).json({
      error: "메뉴 업로드 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// ==================== 식당 관리 API ====================

// 식당 목록 조회
app.get("/api/restaurants", async (req, res) => {
  try {
    const { active_only } = req.query;
    const restaurants =
      active_only === "true" ? await getActiveRestaurants() : await getAllRestaurants();
    res.json(restaurants);
  } catch (error) {
    console.error("식당 목록 조회 오류:", error);
    console.error("오류 스택:", error.stack);
    res.status(500).json({
      error: "식당 목록을 불러오는 중 오류가 발생했습니다.",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// 식당 추가
app.post("/api/restaurants", async (req, res) => {
  try {
    const {
      name,
      building_name,
      address,
      latitude,
      longitude,
      price_lunch,
      price_dinner,
      has_dinner,
      webhook_url,
      webhook_type,
      use_all_days,
      map_url,
      directions_url,
    } = req.body;
    if (!name) {
      return res.status(400).json({ error: "식당 이름은 필수입니다." });
    }

    const newRestaurant = await addRestaurant({
      name,
      building_name,
      address,
      latitude,
      longitude,
      price_lunch,
      price_dinner,
      has_dinner,
      webhook_url,
      webhook_type,
      use_all_days,
      map_url,
      directions_url,
    });
    res.json(newRestaurant);
  } catch (error) {
    console.error("식당 추가 오류:", error);
    res.status(500).json({ error: "식당을 추가하는 중 오류가 발생했습니다." });
  }
});

// 식당 수정
app.put("/api/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await updateRestaurant(id, updateData);
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "해당 식당을 찾을 수 없거나 변경된 내용이 없습니다." });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("식당 수정 오류:", error);
    res
      .status(500)
      .json({ error: "식당 정보를 수정하는 중 오류가 발생했습니다." });
  }
});

// 식당 순서 변경
app.put("/api/restaurants/reorder", async (req, res) => {
  try {
    const { orders } = req.body; // [{ id: 1, sort_order: 1 }, ...]
    if (!Array.isArray(orders)) {
      return res
        .status(400)
        .json({ error: "올바르지 않은 데이터 형식입니다." });
    }

    await updateRestaurantOrders(orders);
    res.json({ success: true });
  } catch (error) {
    console.error("식당 순서 변경 오류:", error);
    res
      .status(500)
      .json({ error: "식당 순서를 변경하는 중 오류가 발생했습니다." });
  }
});

// 식당 삭제
app.delete("/api/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteRestaurant(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "해당 식당을 찾을 수 없습니다." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("식당 삭제 오류:", error);
    res.status(500).json({ error: "식당을 삭제하는 중 오류가 발생했습니다." });
  }
});

// ==================== 날짜 범위 관리 API ====================

// 날짜 범위 목록 조회
app.get("/api/date-ranges", async (req, res) => {
  try {
    const { active_only } = req.query;
    const dateRanges =
      active_only === "true" ? await getActiveDateRanges() : await getAllDateRanges();
    res.json(dateRanges);
  } catch (error) {
    console.error("날짜 범위 목록 조회 오류:", error);
    res.status(500).json({
      error: "날짜 범위 목록을 불러오는 중 오류가 발생했습니다.",
      message: error.message,
    });
  }
});

// 날짜 범위 추가
app.post("/api/date-ranges", async (req, res) => {
  try {
    const { date_range, year, week } = req.body;
    if (!date_range || year === undefined || week === undefined) {
      return res.status(400).json({
        error: "date_range, year, week는 필수입니다.",
      });
    }

    const newDateRange = await addDateRange({
      date_range,
      year,
      week,
    });
    res.json(newDateRange);
  } catch (error) {
    console.error("날짜 범위 추가 오류:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "이미 존재하는 날짜 범위입니다." });
    }
    res
      .status(500)
      .json({ error: "날짜 범위를 추가하는 중 오류가 발생했습니다." });
  }
});

// 날짜 범위 수정
app.put("/api/date-ranges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "유효하지 않은 ID입니다." });
    }

    const result = await updateDateRange(id, req.body);
    if (result.changes === 0) {
      return res.status(404).json({ error: "날짜 범위를 찾을 수 없습니다." });
    }
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error("날짜 범위 수정 오류:", error);
    res
      .status(500)
      .json({ error: "날짜 범위를 수정하는 중 오류가 발생했습니다." });
  }
});

// 날짜 범위 삭제
app.delete("/api/date-ranges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "유효하지 않은 ID입니다." });
    }

    const result = await deleteDateRange(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "날짜 범위를 찾을 수 없습니다." });
    }
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error("날짜 범위 삭제 오류:", error);
    res
      .status(500)
      .json({ error: "날짜 범위를 삭제하는 중 오류가 발생했습니다." });
  }
});

// 서버 시작
app
  .listen(PORT, () => {
    console.log("=".repeat(50));
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(
      `OpenAI API 키: ${
        process.env.OPENAI_API_KEY ? "설정됨" : "설정되지 않음"
      }`
    );
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Supabase 키: ${supabaseKey ? "설정됨" : "설정되지 않음"}`);
    console.log(`데이터 저장 경로: ${menuDataPath}`);
    console.log("=".repeat(50));
  })
  .on("error", (error) => {
    console.error("서버 시작 실패:", error);
    if (error.code === "EADDRINUSE") {
      console.error(
        `포트 ${PORT}가 이미 사용 중입니다. 다른 포트를 사용하거나 해당 포트를 사용하는 프로세스를 종료하세요.`
      );
    }
    process.exit(1);
  });
