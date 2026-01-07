import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveMenuData, getMenuData, getAllMenuData, getMenuDataList } from './database.js';
import { transformDbDataForViewer } from './utils/transform.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:5173', // Vite 개발 서버 (viewer)
    'http://127.0.0.1:5173',  // Vite 개발 서버 (viewer)
    // 프로덕션 도메인은 환경 변수로 추가 가능
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ],
  credentials: true
}));

app.use(express.json());

// uploads 디렉토리 설정
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer 설정 (디스크 스토리지 - 이미지 저장용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // req.body.data에서 식당명과 날짜 추출 (JSON 문자열)
      let restaurant = 'default';
      let dateRange = 'default';
      
      if (req.body.data) {
        try {
          const adminData = JSON.parse(req.body.data);
          restaurant = adminData.name || 'default';
          dateRange = adminData.date || 'default';
        } catch (e) {
          console.error('데이터 파싱 오류:', e);
        }
      }
      
      // 파일명에서 특수문자 제거
      const safeRestaurant = restaurant.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      const safeDateRange = dateRange.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      const uploadPath = path.join(uploadsDir, safeRestaurant, safeDateRange);
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      console.log('이미지 저장 경로:', uploadPath);
      cb(null, uploadPath);
    } catch (error) {
      console.error('이미지 저장 경로 설정 오류:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // 타임스탬프 기반 파일명
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `image_${timestamp}${ext}`);
  }
});

// 이미지 저장용 Multer (디스크 스토리지)
const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 이미지 분석용 Multer (메모리 스토리지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  }
});

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || 'https://vaqfjjkwpzrolebvbnbl.supabase.co';
// service_role 키가 없으면 anon 키 사용 (RLS 정책이 제대로 설정되어 있어야 함)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_JWT_TOKEN;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 이미지 분석 엔드포인트
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API 키가 설정되지 않았습니다.' });
    }

    // 이미지를 base64로 변환
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

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
- 추측하거나 예시를 사용하지 마세요`
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "high" // 고해상도 모드로 텍스트 인식률 향상
              }
            }
          ]
        }
      ],
          max_tokens: 2000,
          response_format: { type: "json_object" },
          temperature: 0.1 // 낮은 온도로 더 일관된 결과
        });
        return response;
      } catch (error) {
        // 재시도 (최대 1회)
        if (retryCount < 1) {
          console.log(`GPT API 호출 실패, 재시도 중... (${retryCount + 1}/1)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
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
      console.error('JSON 파싱 오류:', parseError);
      parsedData = {
        price: { lunch: "", dinner: "" },
        menus: {
          "월": { lunch: [], dinner: [] },
          "화": { lunch: [], dinner: [] },
          "수": { lunch: [], dinner: [] },
          "목": { lunch: [], dinner: [] },
          "금": { lunch: [], dinner: [] }
        }
      };
    }

    // 데이터 검증 및 정제 함수
    const validateAndCleanMenu = (menuArray) => {
      if (!Array.isArray(menuArray)) return [];
      
      return menuArray
        .map(item => {
          // 문자열로 변환
          let cleaned = String(item).trim();
          
          // 빈 문자열 제거
          if (!cleaned) return null;
          
          // 너무 짧은 항목 제거 (1글자 이하, 단, 숫자나 특수문자만 있는 경우)
          if (cleaned.length < 2 && !/^[0-9가-힣]$/.test(cleaned)) return null;
          
          // 이상한 패턴 필터링 (예: "메뉴1", "메뉴2" 같은 플레이스홀더)
          if (/^(메뉴|menu|item|항목|새\s*메뉴)\d*$/i.test(cleaned)) return null;
          
          // 숫자만 있는 경우 제거 (가격이 아닌 메뉴명)
          if (/^\d+[,\d]*원?$/.test(cleaned)) return null;
          
          // 특수 문자만 있는 경우 제거
          if (/^[^\w가-힣\s]+$/.test(cleaned)) return null;
          
          // 너무 긴 항목 제거 (200자 이상, 오인식 가능성)
          if (cleaned.length > 200) return null;
          
          // 공백 정규화 (연속된 공백을 하나로)
          cleaned = cleaned.replace(/\s+/g, ' ');
          
          // 앞뒤 공백 제거
          cleaned = cleaned.trim();
          
          return cleaned;
        })
        .filter(item => item !== null && item.length > 0) // null과 빈 문자열 제거
        .filter((item, index, self) => self.indexOf(item) === index); // 중복 제거
    };

    // 가격 검증 및 정규화 함수
    const validateAndCleanPrice = (price) => {
      if (!price) return "";
      
      let cleaned = String(price).trim();
      
      // 빈 문자열 체크
      if (!cleaned) return "";
      
      // 숫자와 원, 콤마만 남기고 나머지 제거
      cleaned = cleaned.replace(/[^\d,원]/g, '');
      
      // 숫자가 없는 경우 빈 문자열 반환
      if (!/\d/.test(cleaned)) return "";
      
      // 숫자만 추출 (콤마와 원 제거)
      const numbersOnly = cleaned.replace(/[^\d]/g, '');
      
      // 너무 큰 숫자 제거 (1억 이상, 오인식 가능성)
      if (parseInt(numbersOnly) > 100000000) return "";
      
      // 너무 작은 숫자 제거 (100원 미만, 오인식 가능성)
      if (parseInt(numbersOnly) < 100) return "";
      
      // 원 표시 추가 (숫자만 있는 경우)
      if (!cleaned.includes('원')) {
        cleaned = numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
      }
      
      return cleaned;
    };

    // 응답 구조 검증 및 정규화
    const result = {
      price: {
        lunch: validateAndCleanPrice(parsedData.price?.lunch),
        dinner: validateAndCleanPrice(parsedData.price?.dinner)
      },
      menus: {
        "월": {
          lunch: validateAndCleanMenu(parsedData.menus?.월?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.월?.dinner)
        },
        "화": {
          lunch: validateAndCleanMenu(parsedData.menus?.화?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.화?.dinner)
        },
        "수": {
          lunch: validateAndCleanMenu(parsedData.menus?.수?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.수?.dinner)
        },
        "목": {
          lunch: validateAndCleanMenu(parsedData.menus?.목?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.목?.dinner)
        },
        "금": {
          lunch: validateAndCleanMenu(parsedData.menus?.금?.lunch),
          dinner: validateAndCleanMenu(parsedData.menus?.금?.dinner)
        }
      }
    };

    // 응답 품질 검증
    const totalMenus = Object.values(result.menus).reduce((sum, day) => {
      return sum + (day.lunch?.length || 0) + (day.dinner?.length || 0);
    }, 0);
    
    const hasPrices = !!(result.price.lunch || result.price.dinner);
    const hasMenus = totalMenus > 0;
    
    // 품질 검증 로그
    console.log('이미지 분석 결과:', {
      prices: result.price,
      totalMenus,
      hasPrices,
      hasMenus,
      quality: hasPrices && hasMenus ? 'good' : hasMenus ? 'partial' : 'poor'
    });

    // 품질이 너무 낮은 경우 경고 (하지만 결과는 반환)
    if (!hasMenus && !hasPrices) {
      console.warn('경고: 분석 결과가 비어있습니다. 이미지 품질이나 형식을 확인해주세요.');
    }

    res.json(result);

  } catch (error) {
    console.error('이미지 분석 오류:', error);
    res.status(500).json({ 
      error: '이미지 분석 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 데이터 저장 디렉토리 경로
const dataDir = path.join(__dirname, '..', 'data');
const menuDataPath = path.join(dataDir, 'menu-data.json');

// data 디렉토리가 없으면 생성
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 기존 데이터 로드 함수
const loadMenuData = () => {
  try {
    if (fs.existsSync(menuDataPath)) {
      const fileContent = fs.readFileSync(menuDataPath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('데이터 로드 오류:', error);
  }
  return {};
};


// 데이터 저장 엔드포인트 (이미지 포함, DB 저장)
app.post('/api/save', uploadImage.single('image'), async (req, res) => {
  try {
    const adminData = JSON.parse(req.body.data || '{}');
    const imageFile = req.file;
    
    // 필수 필드 검증
    if (!adminData.name || !adminData.date) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다. (name, date)' 
      });
    }

    // 이미지 경로 설정
    let imagePath = null;
    if (imageFile) {
      // multer가 저장한 실제 경로 사용 (상대 경로로 변환)
      const absolutePath = imageFile.path;
      const relativePath = path.relative(__dirname, absolutePath);
      // Windows 경로 구분자를 슬래시로 변환
      imagePath = relativePath.split(path.sep).join('/');
      console.log('이미지 저장 완료:', { absolutePath, relativePath, imagePath });
    } else {
      // 기존 데이터에서 이미지 경로 가져오기
      const existing = getMenuData(adminData.name, adminData.date);
      if (existing && existing.image_path) {
        imagePath = existing.image_path;
      }
    }

    // DB에 저장
    const result = saveMenuData({
      restaurant_name: adminData.name,
      date_range: adminData.date,
      price_lunch: adminData.price?.lunch || '',
      price_dinner: adminData.price?.dinner || '',
      menus: adminData.menus || {},
      image_path: imagePath
    });

    res.json({ 
      success: true, 
      message: '데이터가 성공적으로 저장되었습니다.',
      imagePath: imagePath
    });

  } catch (error) {
    console.error('데이터 저장 오류:', error);
    res.status(500).json({ 
      error: '데이터 저장 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 이미지 파일 제공 엔드포인트 (경로 직접 사용) - 더 구체적인 라우트를 먼저 등록
// Express의 와일드카드 라우팅 문제를 해결하기 위해 정규식 사용
app.get(/^\/api\/images\/path\/(.+)$/, (req, res) => {
  try {
    // req.path에서 정규식으로 경로 추출
    const match = req.path.match(/^\/api\/images\/path\/(.+)$/);
    if (!match || !match[1]) {
      return res.status(400).json({ error: '잘못된 경로 형식입니다.' });
    }
    
    let imagePath = match[1]; // 첫 번째 캡처 그룹
    
    // URL 디코딩
    try {
      imagePath = decodeURIComponent(imagePath);
    } catch (e) {
      console.warn('URL 디코딩 경고:', e.message);
    }
    
    // URL 경로 구분자를 시스템 경로 구분자로 변환
    const normalizedPath = imagePath.split('/').join(path.sep);
    const fullPath = path.join(__dirname, normalizedPath);
    
    console.log('[/api/images/path] 요청:', { 
      reqUrl: req.url,
      reqPath: req.path,
      match: match[1],
      imagePath, 
      normalizedPath, 
      fullPath,
      __dirname 
    });
    
    // 보안: 상대 경로 공격 방지
    const resolvedPath = path.resolve(fullPath);
    const basePath = path.resolve(__dirname);
    
    if (!resolvedPath.startsWith(basePath)) {
      console.log('[/api/images/path] 보안 오류:', { resolvedPath, basePath });
      return res.status(403).json({ error: '접근이 거부되었습니다.' });
    }
    
    if (!fs.existsSync(resolvedPath)) {
      console.log('[/api/images/path] 파일 없음:', resolvedPath);
      console.log('[/api/images/path] 시도한 경로들:', {
        imagePath,
        normalizedPath,
        fullPath,
        resolvedPath,
        basePath,
        exists: fs.existsSync(fullPath)
      });
      return res.status(404).json({ error: '이미지 파일을 찾을 수 없습니다.' });
    }

    // 이미지 파일 전송
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('이미지 제공 오류:', error);
    res.status(500).json({ 
      error: '이미지 제공 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 데이터 불러오기 API
app.get('/api/load', (req, res) => {
  try {
    console.log('[/api/load] 요청 받음:', req.query);
    const { restaurant, date } = req.query;
    
    // 특정 식당/날짜 데이터 조회
    if (restaurant && date) {
      const menuData = getMenuData(restaurant, date);
      
      if (!menuData) {
        console.log('[/api/load] 데이터 없음:', restaurant, date);
        // 404 대신 200 OK와 null 반환하여 프론트엔드에서 조용히 처리
        return res.status(200).json(null);
      }

      // 이미지 URL 생성 - 이미지 경로를 직접 사용 (URL 인코딩 문제 방지)
      let imageUrl = null;
      if (menuData.image_path) {
        // 이미지 경로를 직접 사용하여 URL 파라미터 인코딩 문제 방지
        imageUrl = `/api/images/path/${encodeURIComponent(menuData.image_path)}`;
      }

      res.json({
        ...menuData,
        imageUrl: imageUrl
      });
    } 
    // 목록 조회
    else if (req.query.list === 'true') {
      const list = getMenuDataList();
      res.json(list);
    }
    // 파라미터 없으면 에러
    else {
      res.status(400).json({ 
        error: 'restaurant와 date 파라미터가 필요합니다.' 
      });
    }
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    res.status(500).json({ 
      error: '데이터 조회 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 게시 API: DB 데이터를 뷰어용 JSON 파일로 생성
app.post('/api/publish', async (req, res) => {
  try {
    // DB에서 모든 데이터 조회
    const allData = getAllMenuData();
    
    if (allData.length === 0) {
      return res.status(400).json({ 
        error: '게시할 데이터가 없습니다. 먼저 데이터를 저장해주세요.' 
      });
    }

    // viewer/public/images/ 디렉토리 생성
    const viewerImagesDir = path.join(__dirname, '..', 'viewer', 'public', 'images');
    if (!fs.existsSync(viewerImagesDir)) {
      fs.mkdirSync(viewerImagesDir, { recursive: true });
    }

    // 뷰어 형식으로 변환 (식당명을 키로 하는 객체)
    const viewerData = {};
    allData.forEach(dbData => {
      let imageBase64 = null;
      
      // 이미지 파일이 있으면 base64로 인코딩
      if (dbData.image_path) {
        try {
          const imageAbsolutePath = path.join(__dirname, dbData.image_path);
          if (fs.existsSync(imageAbsolutePath)) {
            const imageBuffer = fs.readFileSync(imageAbsolutePath);
            const imageExt = path.extname(imageAbsolutePath).toLowerCase();
            let mimeType = 'image/jpeg';
            
            if (imageExt === '.png') mimeType = 'image/png';
            else if (imageExt === '.gif') mimeType = 'image/gif';
            else if (imageExt === '.webp') mimeType = 'image/webp';
            
            imageBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            
            // 이미지 파일을 viewer/public/images/로도 복사 (상대 경로 참조용)
            const imageFileName = path.basename(imageAbsolutePath);
            const viewerImagePath = path.join(viewerImagesDir, imageFileName);
            fs.copyFileSync(imageAbsolutePath, viewerImagePath);
            console.log('이미지 복사 완료:', viewerImagePath);
          }
        } catch (imageError) {
          console.error('이미지 처리 오류:', imageError);
        }
      }
      
      const transformed = transformDbDataForViewer(dbData, imageBase64);
      viewerData[transformed.name] = transformed;
    });

    // JSON 파일로 저장
    fs.writeFileSync(
      menuDataPath, 
      JSON.stringify(viewerData, null, 2), 
      'utf-8'
    );

    // viewer/public/data/로도 복사
    const viewerDataPath = path.join(__dirname, '..', 'viewer', 'public', 'data', 'menu-data.json');
    const viewerDataDir = path.dirname(viewerDataPath);
    if (!fs.existsSync(viewerDataDir)) {
      fs.mkdirSync(viewerDataDir, { recursive: true });
    }
    fs.writeFileSync(
      viewerDataPath, 
      JSON.stringify(viewerData, null, 2), 
      'utf-8'
    );

    res.json({ 
      success: true, 
      message: '데이터가 성공적으로 게시되었습니다.',
      count: allData.length
    });

  } catch (error) {
    console.error('데이터 게시 오류:', error);
    res.status(500).json({ 
      error: '데이터 게시 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 저장된 데이터 조회 엔드포인트 (기존 호환성 유지)
app.get('/api/data', (req, res) => {
  try {
    const data = loadMenuData();
    res.json(data);
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    res.status(500).json({ 
      error: '데이터 조회 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== 민원 관련 API ====================

// 민원 제출
app.post('/api/complaints', async (req, res) => {
  try {
    const { restaurant_name, date_range, category, title, content, user_name, user_email } = req.body;

    // 필수 필드 검증
    if (!restaurant_name || !category || !title || !content || !user_name || !user_email) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다. (restaurant_name, category, title, content, user_name, user_email)' 
      });
    }

    // 카테고리 검증
    const validCategories = ['메뉴', '가격', '품질', '기타'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `유효하지 않은 카테고리입니다. 가능한 값: ${validCategories.join(', ')}` 
      });
    }

    // Supabase에 민원 저장
    const { data, error } = await supabase
      .from('complaints')
      .insert([
        {
          restaurant_name,
          date_range: date_range || null,
          category,
          title,
          content,
          user_name,
          user_email,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase 오류:', error);
      return res.status(500).json({ 
        error: '민원 제출 중 오류가 발생했습니다.',
        message: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: '민원이 성공적으로 제출되었습니다.',
      data 
    });

  } catch (error) {
    console.error('민원 제출 오류:', error);
    res.status(500).json({ 
      error: '민원 제출 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 민원 목록 조회
app.get('/api/complaints', async (req, res) => {
  try {
    const { status, restaurant_name, user_email, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // 필터링
    if (status) {
      query = query.eq('status', status);
    }
    if (restaurant_name) {
      query = query.eq('restaurant_name', restaurant_name);
    }
    if (user_email) {
      query = query.eq('user_email', user_email);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase 오류:', error);
      return res.status(500).json({ 
        error: '민원 조회 중 오류가 발생했습니다.',
        message: error.message 
      });
    }

    res.json({ 
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('민원 조회 오류:', error);
    res.status(500).json({ 
      error: '민원 조회 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 특정 민원 상세 조회
app.get('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          error: '민원을 찾을 수 없습니다.' 
        });
      }
      console.error('Supabase 오류:', error);
      return res.status(500).json({ 
        error: '민원 조회 중 오류가 발생했습니다.',
        message: error.message 
      });
    }

    res.json({ 
      success: true,
      data 
    });

  } catch (error) {
    console.error('민원 조회 오류:', error);
    res.status(500).json({ 
      error: '민원 조회 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// 민원 업데이트 (상태 변경 및 답변 작성)
app.put('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    // 업데이트할 필드 구성
    const updateData = {};
    if (status) {
      const validStatuses = ['pending', 'processing', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(', ')}` 
        });
      }
      updateData.status = status;
    }
    if (admin_response !== undefined) {
      updateData.admin_response = admin_response;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: '업데이트할 필드가 없습니다.' 
      });
    }

    const { data, error } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          error: '민원을 찾을 수 없습니다.' 
        });
      }
      console.error('Supabase 오류:', error);
      return res.status(500).json({ 
        error: '민원 업데이트 중 오류가 발생했습니다.',
        message: error.message 
      });
    }

    res.json({ 
      success: true,
      message: '민원이 성공적으로 업데이트되었습니다.',
      data 
    });

  } catch (error) {
    console.error('민원 업데이트 오류:', error);
    res.status(500).json({ 
      error: '민원 업데이트 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`OpenAI API 키: ${process.env.OPENAI_API_KEY ? '설정됨' : '설정되지 않음'}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Supabase 키: ${supabaseKey ? '설정됨' : '설정되지 않음'}`);
  console.log(`데이터 저장 경로: ${menuDataPath}`);
});

