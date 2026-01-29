import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 날짜 범위 문자열에서 특정 요일에 해당하는 실제 날짜를 계산
 * @param {string} dateRange - "1월 5일 ~ 1월 9일" 형식
 * @param {string} day - "월", "화", "수", "목", "금"
 * @returns {Object} { year, month, day, dateString, koreanDate }
 */
export function parseDateFromRange(dateRange, day) {
  // 입력 검증
  if (!dateRange || typeof dateRange !== 'string') {
    throw new Error(`날짜 범위가 올바르지 않습니다: "${dateRange}" (문자열이어야 함)`);
  }
  
  if (!day || typeof day !== 'string') {
    throw new Error(`요일이 올바르지 않습니다: "${day}" (문자열이어야 함)`);
  }

  const dayMap = { '월': 0, '화': 1, '수': 2, '목': 3, '금': 4 };
  const dayIndex = dayMap[day];
  
  if (dayIndex === undefined) {
    throw new Error(`유효하지 않은 요일: "${day}". 가능한 값: 월, 화, 수, 목, 금`);
  }

  // "1월 5일 ~ 1월 9일" 형식 파싱
  // 다양한 형식 지원: "1월 5일 ~ 1월 9일", "1월5일~1월9일", "1월 5일~1월 9일"
  const match = dateRange.match(/(\d+)월\s*(\d+)일/);
  if (!match) {
    throw new Error(
      `날짜 범위 형식이 올바르지 않습니다: "${dateRange}". ` +
      `예상 형식: "1월 5일 ~ 1월 9일" 또는 "1월5일~1월9일"`
    );
  }

  const startMonth = parseInt(match[1], 10);
  const startDay = parseInt(match[2], 10);
  
  // 월과 일 유효성 검증
  if (isNaN(startMonth) || startMonth < 1 || startMonth > 12) {
    throw new Error(`유효하지 않은 월: ${startMonth}. 1-12 사이의 값이어야 합니다.`);
  }
  
  if (isNaN(startDay) || startDay < 1 || startDay > 31) {
    throw new Error(`유효하지 않은 일: ${startDay}. 1-31 사이의 값이어야 합니다.`);
  }
  
  // 현재 연도 가져오기
  const currentYear = new Date().getFullYear();
  
  // 시작 날짜 생성
  const startDate = new Date(currentYear, startMonth - 1, startDay);
  
  // 날짜 유효성 검증 (예: 2월 30일 같은 경우)
  if (startDate.getMonth() !== startMonth - 1 || startDate.getDate() !== startDay) {
    throw new Error(`유효하지 않은 날짜: ${startMonth}월 ${startDay}일`);
  }
  
  // 요일 인덱스만큼 더하기
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + dayIndex);
  
  // 결과 날짜 유효성 검증
  if (targetDate.getFullYear() !== currentYear) {
    // 연도가 바뀌는 경우 경고 (예: 12월 말)
    console.warn(`날짜 계산 결과 연도가 변경됨: ${currentYear} -> ${targetDate.getFullYear()}`);
  }
  
  return {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1,
    day: targetDate.getDate(),
    dateString: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
    koreanDate: `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일`
  };
}

/**
 * 식당별 메뉴 카드 마크다운 생성
 * @param {Array} menuDataList - 메뉴 데이터 배열
 * @param {string} day - 요일 ("월", "화", "수", "목", "금")
 * @returns {string} 마크다운 문자열
 */
function generateMenuCardsMarkdown(menuDataList, day) {
  if (!menuDataList || menuDataList.length === 0) {
    return '> 메뉴 정보가 없습니다.\n';
  }

  let markdown = '';

  menuDataList.forEach((restaurant, index) => {
    const dayMenu = restaurant.menus?.[day] || { lunch: [], dinner: [] };
    const excludedItems = restaurant.excluded_menu_items || [];

    // 제외 항목 필터링 (점심 메뉴만 표시)
    const lunchMenus = (dayMenu.lunch || []).filter(item => !excludedItems.includes(item));

    // 점심 메뉴가 없으면 스킵
    if (lunchMenus.length === 0) {
      return;
    }

    // 이미지 URL 처리
    const imagePaths = restaurant.image_paths || {};
    let imageUrl = imagePaths[day] || restaurant.image_path || null;

    // Supabase Storage URL로 변환
    if (imageUrl && !imageUrl.startsWith('http')) {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      if (imageUrl.startsWith('menu-images/') || imageUrl.startsWith('centumbob-menu-images/')) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/centumbob-menu-images/${imageUrl.replace('menu-images/', '').replace('centumbob-menu-images/', '')}`;
      }
    }

    // 식당 카드 생성
    markdown += `\n### 🍽️ ${restaurant.restaurant_name}\n\n`;

    // 이미지가 있으면 표시
    if (imageUrl) {
      markdown += `![${restaurant.restaurant_name} 식단표](${imageUrl})\n\n`;
    }

    // 점심 메뉴
    if (lunchMenus.length > 0) {
      markdown += `**☀️ 점심**\n`;
      lunchMenus.forEach(menu => {
        markdown += `- ${menu}\n`;
      });
      markdown += '\n';
    }

    markdown += '---\n';
  });

  return markdown;
}

/**
 * 메뉴 항목에 적절한 이모지 매핑
 * @param {string} menuItem - 메뉴 항목명
 * @returns {string} 이모지
 */
function getMenuEmoji(menuItem) {
  const item = menuItem.toLowerCase();

  // 밥류
  if (item.includes('밥') || item.includes('rice')) return '🍚';
  // 국/탕/찌개
  if (item.includes('국') || item.includes('탕') || item.includes('찌개') || item.includes('전골')) return '🥣';
  // 면류
  if (item.includes('면') || item.includes('국수') || item.includes('파스타') || item.includes('라면') || item.includes('우동') || item.includes('칼국수')) return '🍝';
  // 고기류
  if (item.includes('불고기') || item.includes('갈비') || item.includes('삼겹') || item.includes('제육') || item.includes('돈') || item.includes('돼지') || item.includes('소고기')) return '🥩';
  // 치킨/닭
  if (item.includes('치킨') || item.includes('닭') || item.includes('통닭') || item.includes('윙봉')) return '🍗';
  // 튀김류
  if (item.includes('까스') || item.includes('커틀렛') || item.includes('튀김') || item.includes('후라이') || item.includes('너겟')) return '🍤';
  // 찜/조림
  if (item.includes('찜') || item.includes('조림') || item.includes('스테이크')) return '🍖';
  // 볶음
  if (item.includes('볶음') || item.includes('잡채')) return '🥘';
  // 샐러드/나물
  if (item.includes('샐러드') || item.includes('나물') || item.includes('무침') || item.includes('야채')) return '🥗';
  // 김치
  if (item.includes('김치')) return '🥬';
  // 계란
  if (item.includes('계란') || item.includes('달걀') || item.includes('오믈렛')) return '🍳';
  // 두부
  if (item.includes('두부')) return '🧈';
  // 생선/해산물
  if (item.includes('생선') || item.includes('고등어') || item.includes('삼치') || item.includes('조기') || item.includes('오징어') || item.includes('새우') || item.includes('해물')) return '🐟';
  // 디저트
  if (item.includes('디저트') || item.includes('케이크') || item.includes('티라미수') || item.includes('빵') || item.includes('과일')) return '🍰';
  // 음료
  if (item.includes('음료') || item.includes('커피') || item.includes('야쿠르트') || item.includes('우유')) return '🍶';
  // 전/부침
  if (item.includes('전') && (item.includes('김치') || item.includes('부추') || item.includes('파전'))) return '🥞';
  // 만두
  if (item.includes('만두')) return '🥟';
  // 피클/절임
  if (item.includes('피클') || item.includes('장아찌') || item.includes('오이')) return '🥒';
  // 버섯
  if (item.includes('버섯')) return '🍄';

  // 기본값
  return '🍴';
}

/**
 * 가격 포맷팅 (숫자를 원화 형식으로)
 * @param {string|number} price - 가격
 * @returns {string} 포맷된 가격
 */
function formatPrice(price) {
  if (!price) return '가격 미정';
  const numPrice = typeof price === 'string' ? parseInt(price.replace(/[^0-9]/g, ''), 10) : price;
  if (isNaN(numPrice) || numPrice === 0) return '가격 미정';
  return `${numPrice.toLocaleString()}원`;
}

/**
 * 식당별 메뉴 카드 HTML 생성 (인라인 스타일 - 티스토리 호환)
 * @param {Array} menuDataList - 메뉴 데이터 배열
 * @param {string} day - 요일 ("월", "화", "수", "목", "금")
 * @returns {string} HTML 문자열
 */
function generateMenuCardsHtml(menuDataList, day) {
  if (!menuDataList || menuDataList.length === 0) {
    return '<p style="color: #6b7280; text-align: center; padding: 32px 0;">메뉴 정보가 없습니다.</p>';
  }

  // 카드 그리드 스타일 (CSS Grid 대신 Flexbox 사용 - 호환성)
  let html = '<div style="display: flex; flex-wrap: wrap; gap: 24px; justify-content: center;">\n';

  menuDataList.forEach((restaurant) => {
    const dayMenu = restaurant.menus?.[day] || { lunch: [], dinner: [] };
    const excludedItems = restaurant.excluded_menu_items || [];

    // 제외 항목 필터링 (점심 메뉴만 표시)
    const lunchMenus = (dayMenu.lunch || []).filter(item => !excludedItems.includes(item));

    // 점심 메뉴가 없으면 스킵
    if (lunchMenus.length === 0) {
      return;
    }

    // 가격 정보
    const priceLunch = restaurant.price_lunch || '';
    const buildingName = restaurant.building_name || '';

    // 식당 카드 생성 (인라인 스타일)
    html += `
    <div style="background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #f3f4f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1 1 300px; max-width: 380px; min-width: 280px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
                <h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 4px 0; line-height: 1.3;">${restaurant.restaurant_name}</h3>
                ${buildingName ? `<p style="font-size: 13px; color: #2563eb; font-weight: 500; margin: 0;">${buildingName}</p>` : ''}
            </div>
            <span style="background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; white-space: nowrap;">${formatPrice(priceLunch)}</span>
        </div>
        <div style="border-top: 1px dashed #e5e7eb; padding-top: 16px;">
            <ul style="list-style: none; padding: 0; margin: 0; color: #4b5563; font-size: 14px;">`;

    // 점심 메뉴
    lunchMenus.forEach(menu => {
      const emoji = getMenuEmoji(menu);
      html += `
                <li style="display: flex; align-items: flex-start; margin-bottom: 8px;"><span style="margin-right: 8px;">${emoji}</span> ${menu}</li>`;
    });

    html += `
            </ul>
        </div>
    </div>\n`;
  });

  html += '</div>\n';

  return html;
}

/**
 * Jekyll 블로그 포스트 생성 (센텀 직장인 모닝 브리핑 스타일)
 * @param {Object} params
 * @param {string} params.dateString - "2025-01-05" 형식
 * @param {string} params.koreanDate - "2025년 1월 5일" 형식
 * @param {string} params.imagePath - 이미지 파일 경로 (상대 경로) - 대표 이미지용
 * @param {string} params.postsDir - _posts 폴더 경로
 * @param {Object} params.gptContent - GPT 생성 콘텐츠
 * @param {Array} params.menuDataList - 메뉴 데이터 배열 (식당별 카드용)
 * @param {string} params.day - 요일 ("월", "화", "수", "목", "금")
 * @returns {string} 생성된 포스트 파일 경로
 */
export function generateJekyllPost({ dateString, koreanDate, imagePath, postsDir, gptContent = null, menuDataList = null, day = null }) {
  // _posts 폴더가 없으면 생성
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  // assets/images 폴더 생성
  const assetsDir = path.join(postsDir, 'assets', 'images');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 파일명 생성 (YYYY-MM-DD-제목.md)
  const title = `[센텀밥집] ${koreanDate} 센텀식단표`;
  // slug 생성
  const slug = `centum-menu-${dateString}`;
  const filename = `${dateString}-${slug}.md`;
  const filePath = path.join(postsDir, filename);

  const description = `${koreanDate} 센텀시티 구내식당 식단표 - 오늘의 점심 메뉴와 뉴스, 스몰토크 주제`;

  // 요일 추출
  const dayOfWeek = new Date(dateString).getDay();
  const dayMap = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayKorean = dayMap[dayOfWeek];

  // SEO 최적화 태그 생성
  const tags = [
    '센텀식단표',
    '센텀시티식단표',
    '센텀구내식당',
    '센텀밥집',
    '해운대구내식당',
    '부산구내식당',
    '센텀점심메뉴',
    '센텀직장인',
    '구내식당식단표',
    '직장인점심',
    '오늘의식단',
    dayKorean + '식단',
    '주간식단표',
    '센텀맛집'
  ];

  // 식당별 메뉴 카드 생성
  const menuCardsMarkdown = menuDataList && day
    ? generateMenuCardsMarkdown(menuDataList, day)
    : `![${koreanDate} 식단표](${imagePath})\n`;

  // Jekyll front matter 생성
  const frontMatter = `---
layout: post
title: "${title}"
date: ${dateString} 08:00:00 +0900
categories: [센텀밥집, 센텀식단]
tags: [${tags.join(', ')}]
description: "${description}"
image: ${imagePath}
---

👋 좋은 아침입니다, 센텀 직장인 여러분!

## 🍴 오늘의 센텀 점심 식단표 (${koreanDate.split(' ')[1]} ${koreanDate.split(' ')[2]})

${menuCardsMarkdown}

## 💪 활기찬 하루를 위한 응원 한마디

${gptContent?.overview || "오늘도 활기찬 하루 시작하세요!"}

---

## 📰 오늘의 주요 뉴스 요약

바쁜 직장인분들을 위해 핵심 뉴스만 골라왔습니다.

### 🏢 [부산/지역 소식]
${(gptContent?.newsBusan || []).map((item, index) => `**${index + 1}. ${item.title}**\n${item.content}\n`).join('\n')}

### 🌏 [전국/경제 이슈]
${(gptContent?.newsNational || []).map((item, index) => `**${index + 1}. ${item.title}**\n${item.content}\n`).join('\n')}

---

## 🗣️ 오늘의 스몰토크 주제 (3가지)

식사 시간에 가볍게 꺼내기 좋은 주제들입니다.

${(gptContent?.smallTalkList || []).map((item, index) => `**${index + 1}️⃣ ${item.topic}**\n: ${item.content}\n`).join('\n')}

---

맛있는 점심 드시고 오후 업무도 화이팅하세요! 💪

**센텀밥집** - 뉴스와 식단을 한 번에 전해드립니다.
🔗 [https://aoperat.github.io/centumbob](https://aoperat.github.io/centumbob)
`;

  // 파일 저장
  fs.writeFileSync(filePath, frontMatter, 'utf-8');

  return filePath;
}

/**
 * 이미지 파일을 assets/images 폴더로 복사
 * @param {string} sourcePath - 원본 이미지 경로
 * @param {string} targetFilename - 저장할 파일명
 * @param {string} postsDir - _posts 폴더 경로
 * @returns {string} 저장된 이미지의 상대 경로
 */
export function saveBlogImage(sourcePath, targetFilename, postsDir) {
  const assetsDir = path.join(postsDir, 'assets', 'images');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const targetPath = path.join(assetsDir, targetFilename);
  fs.copyFileSync(sourcePath, targetPath);

  // 상대 경로 반환 (Jekyll에서 사용)
  return `assets/images/${targetFilename}`;
}

/**
 * GPT를 사용하여 메뉴 데이터로부터 블로그 콘텐츠 생성
 * 에디터 스타일의 재미있는 리뷰 + 날씨/기분/다이어트 추천
 * @param {Object} params
 * @param {Array} params.menuDataList - 해당 날짜 범위의 모든 메뉴 데이터
 * @param {string} params.day - 요일 ("월", "화", "수", "목", "금")
 * @param {string} params.koreanDate - "2025년 1월 5일" 형식
 * @param {string} params.apiKey - OpenAI API 키
 * @param {Object} [params.newsData] - 외부에서 주입된 뉴스 및 날씨 데이터 (선택 사항)
 * @returns {Promise<Object>} { quickSummary, weatherRecommend, dietAnalysis, editorReview, description }
 */
export async function generateBlogContent({ menuDataList, day, koreanDate, apiKey, newsData = null }) {
  if (!apiKey) {
    console.warn('[GPT 콘텐츠 생성] API 키가 없어 기본 콘텐츠 반환');
    return {
      quickSummary: '',
      weatherRecommend: '',
      dietAnalysis: '',
      editorReview: '',
      description: `${koreanDate} 센텀시티 구내식당 식단표입니다.`
    };
  }

  try {
    const openai = new OpenAI({ apiKey });

    // 해당 요일의 메뉴 추출 (식당별로 구분, 제외 항목 필터링)
    const restaurantMenus = menuDataList.map(restaurant => {
      const dayMenu = restaurant.menus[day] || { lunch: [], dinner: [] };
      const lunchMenus = dayMenu.lunch || [];
      const dinnerMenus = dayMenu.dinner || [];
      
      // 제외 항목 목록 가져오기
      const excludedItems = restaurant.excluded_menu_items || [];
      
      // 제외 항목 필터링
      const filteredLunchMenus = lunchMenus.filter(item => !excludedItems.includes(item));
      const filteredDinnerMenus = dinnerMenus.filter(item => !excludedItems.includes(item));
      
      return {
        name: restaurant.restaurant_name,
        lunch: filteredLunchMenus,
        dinner: filteredDinnerMenus,
        allMenus: [...filteredLunchMenus, ...filteredDinnerMenus]
      };
    }).filter(r => r.allMenus.length > 0);

    if (restaurantMenus.length === 0) {
      return {
        quickSummary: '',
        weatherRecommend: '',
        dietAnalysis: '',
        editorReview: '',
        description: `${koreanDate} 센텀시티 구내식당 식단표입니다.`
      };
    }

    // 요일별 기분 컨텍스트
    const dayMoodMap = {
      '월': '월요병 극복이 필요한',
      '화': '본격 업무 모드',
      '수': '한 주의 중간, 버티기 힘든',
      '목': '주말이 코앞인',
      '금': '불금 전야제'
    };

    const dayMood = dayMoodMap[day] || '';

    // 식당별 메뉴 텍스트 생성
    const menuDataText = restaurantMenus.map(r => {
      return `[${r.name}]
  점심: ${r.lunch.length > 0 ? r.lunch.join(', ') : '없음'}
  저녁: ${r.dinner.length > 0 ? r.dinner.join(', ') : '없음'}`;
    }).join('\n\n');

    // 뉴스 데이터 텍스트 생성
    let newsContext = "";
    if (newsData) {
      // 배열 형식의 뉴스 데이터를 텍스트로 변환
      const formatNewsArray = (newsArray, type = 'news') => {
        if (!newsArray || !Array.isArray(newsArray) || newsArray.length === 0) {
          return "정보 없음";
        }
        return newsArray.map((item, i) => {
          if (type === 'smallTalk') {
            return `${i+1}. [${item.topic}] ${item.content}`;
          }
          return `${i+1}. [${item.title}] ${item.content}`;
        }).join('\n');
      };

      newsContext = `
[오늘의 실제 뉴스 데이터 - 반드시 이 내용을 블로그에 포함시켜야 합니다]

🌤️ 날씨: ${newsData.weather || "정보 없음"}

📍 부산/지역 소식:
${formatNewsArray(newsData.busanNews)}

🌏 전국/경제 이슈:
${formatNewsArray(newsData.nationalNews)}

🎉 가벼운 이슈:
${formatNewsArray(newsData.lightNews)}

💬 스몰토크 주제:
${formatNewsArray(newsData.smallTalk, 'smallTalk')}

⚠️ 중요: 위 뉴스 데이터를 그대로 사용하세요. 새로 만들어내지 마세요!
`;
    }

    const prompt = `오늘의 센텀시티 구내식당 메뉴입니다:

${menuDataText}

오늘은 ${koreanDate} ${day}요일입니다. (${dayMood} 날)
${newsContext}

아래 형식의 JSON으로 응답해주세요. 친근하고 재미있는 에디터 말투로 작성하세요!

⚠️ 중요 규칙:
- 가격은 절대 언급하지 마세요
- 식당 이름은 [식당명] 형식으로 언급해도 됩니다
- 이모지를 적극 활용하세요
- 직장인에게 공감되는 유머러스한 말투로 작성
${newsData ? `- ⚠️ 매우 중요: [오늘의 실제 뉴스 데이터]에 제공된 내용을 반드시 그대로 사용하세요!
- 뉴스 제목과 내용을 임의로 만들어내지 마세요. 제공된 데이터를 참고하여 블로그 톤에 맞게 다듬기만 하세요.
- 날씨 정보: "${newsData.weather || '정보 없음'}"를 weatherRecommend에 반영하세요.
- news_busan, news_national, small_talk_list는 제공된 데이터를 기반으로 작성하세요.` : "- 뉴스 데이터가 없으므로 일반적인 내용으로 작성하세요."}

{
  "quickSummary": {
    "intro": "바쁜 직장인을 위한 3초 요약 인트로 (1문장)",
    "mainDish": {
      "restaurant": "오늘의 메인 대장 식당명",
      "menu": "대표 메뉴",
      "comment": "짧고 재미있는 코멘트 (이모지 포함)"
    },
    "weatherPick": {
      "restaurant": "날씨/기분 추천 식당명",
      "menu": "추천 메뉴",
      "comment": "날씨나 기분과 연결한 코멘트 (이모지 포함)"
    },
    "dietPick": {
      "restaurant": "다이어트 추천 식당명",
      "menu": "추천 메뉴",
      "comment": "다이어터를 위한 코멘트 (이모지 포함)"
    }
  },

  "news_busan": [
    { "title": "뉴스 제목", "content": "제공된 부산 소식 상세 요약 (3문장 내외, 흥미로운 세부 내용 포함)" },
    { "title": "뉴스 제목", "content": "제공된 부산 소식 상세 요약 (3문장 내외)" },
    { "title": "뉴스 제목", "content": "제공된 부산 소식 상세 요약 (3문장 내외)" }
  ],

  "news_national": [
    { "title": "뉴스 제목", "content": "제공된 전국/경제 소식 상세 요약 (3문장 내외, 직장인 관심사 위주)" },
    { "title": "뉴스 제목", "content": "제공된 전국/경제 소식 상세 요약 (3문장 내외)" },
    { "title": "뉴스 제목", "content": "제공된 전국/경제 소식 상세 요약 (3문장 내외)" }
  ],

  "small_talk_list": [
    { "topic": "주제 1", "content": "대화하기 좋은 내용 (1-2문장)" },
    { "topic": "주제 2", "content": "대화하기 좋은 내용 (1-2문장)" },
    { "topic": "주제 3", "content": "대화하기 좋은 내용 (1-2문장)" }
  ],

  "overview": "${day}요일 점심시간 인트로 멘트 (2문장, 요일 특성 반영, 이모지 포함)",

  "weatherRecommend": "날씨/기분 맞춤 추천 섹션 (마크다운 형식)",

  "dietAnalysis": "헬스 & 다이어트 분석 (마크다운 형식)",

  "editorReview": "에디터의 사심 가득 리뷰 (3-4문장)",

  "callToAction": "댓글 유도 멘트 (1-2문장, 질문 형식)",

  "description": "SEO용 메타 설명 (1문장, 100자 이내)"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-11-20",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
      temperature: 0.85
    });

    const content = response.choices[0].message.content;
    const parsedContent = JSON.parse(content);

    return {
      quickSummary: parsedContent.quickSummary || null,
      overview: parsedContent.overview || '',
      weatherRecommend: parsedContent.weatherRecommend || '',
      dietAnalysis: parsedContent.dietAnalysis || '',
      editorReview: parsedContent.editorReview || '',
      callToAction: parsedContent.callToAction || '',
      description: parsedContent.description || `${koreanDate} 센텀시티 구내식당 식단표입니다.`,
      // 추가/수정된 필드
      newsBusan: parsedContent.news_busan || [],
      newsNational: parsedContent.news_national || [],
      smallTalkList: parsedContent.small_talk_list || []
    };
  } catch (error) {
    console.error('[GPT 콘텐츠 생성] 오류:', error);
    return {
      quickSummary: null,
      overview: '',
      weatherRecommend: '',
      dietAnalysis: '',
      editorReview: '',
      callToAction: '',
      description: `${koreanDate} 센텀시티 구내식당 식단표입니다.`,
      news: [],
      small_talk: {},
      main_dishes: []
    };
  }
}

/**
 * 티스토리용 HTML 블로그 포스트 생성 (Tailwind CSS 기반)
 * @param {Object} params
 * @param {string} params.dateString - "2025-01-05" 형식
 * @param {string} params.koreanDate - "2025년 1월 5일" 형식
 * @param {string} params.imagePath - 이미지 파일 경로 (대표 이미지용)
 * @param {string} params.postsDir - 저장 폴더 경로
 * @param {Object} params.gptContent - GPT 생성 콘텐츠
 * @param {Array} params.menuDataList - 메뉴 데이터 배열 (식당별 카드용)
 * @param {string} params.day - 요일 ("월", "화", "수", "목", "금")
 * @returns {string} 생성된 HTML 파일 경로
 */
export function generateTistoryPost({ dateString, koreanDate, imagePath, postsDir, gptContent = null, menuDataList = null, day = null }) {
  // tistory 폴더 생성
  const tistoryDir = path.join(postsDir, 'tistory');
  if (!fs.existsSync(tistoryDir)) {
    fs.mkdirSync(tistoryDir, { recursive: true });
  }

  const title = `[센텀밥집] ${koreanDate} 센텀식단표`;
  const filename = `${dateString}-tistory.html`;
  const filePath = path.join(tistoryDir, filename);

  // 요일 추출
  const dayOfWeek = new Date(dateString).getDay();
  const dayMap = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayKorean = dayMap[dayOfWeek];

  // SEO 최적화 태그 생성 (롱테일 키워드 추가)
  const tags = [
    '센텀식단표',
    '센텀시티식단표',
    '센텀구내식당',
    '센텀밥집',
    '해운대구내식당',
    '부산구내식당',
    '센텀점심메뉴',
    '센텀직장인',
    '구내식당식단표',
    '직장인점심',
    '오늘의식단',
    dayKorean + '식단',
    '주간식단표',
    '센텀맛집',
    '센텀오늘점심',
    'BIFC식당',
    '부산직장인점심'
  ];

  const description = `${koreanDate} 센텀시티 구내식당 식단표 - 오늘의 점심 메뉴와 뉴스, 스몰토크 주제`;

  // 뉴스 섹션 HTML 생성 (인라인 스타일)
  const busanNewsHtml = (gptContent?.newsBusan || []).map((item, index) => `
                <div style="background: #ffffff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #f3f4f6; margin-bottom: 12px;">
                    <h4 style="font-weight: 600; color: #1f2937; margin: 0 0 8px 0; font-size: 15px;">${index + 1}. ${item.title}</h4>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">${item.content}</p>
                </div>`).join('\n');

  const nationalNewsHtml = (gptContent?.newsNational || []).map((item, index) => `
                <div style="background: #ffffff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #f3f4f6; margin-bottom: 12px;">
                    <h4 style="font-weight: 600; color: #1f2937; margin: 0 0 8px 0; font-size: 15px;">${index + 1}. ${item.title}</h4>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">${item.content}</p>
                </div>`).join('\n');

  const smallTalkHtml = (gptContent?.smallTalkList || []).map((item, index) => `
                <div style="background: #fffbeb; border-radius: 12px; padding: 16px; border: 1px solid #fef3c7; margin-bottom: 12px;">
                    <p style="font-weight: 600; color: #92400e; margin: 0 0 4px 0; font-size: 14px;">${index + 1}️⃣ ${item.topic}</p>
                    <p style="color: #374151; font-size: 14px; margin: 0;">${item.content}</p>
                </div>`).join('\n');

  // 식당별 메뉴 카드 HTML 생성
  const menuCardsHtml = menuDataList && day
    ? generateMenuCardsHtml(menuDataList, day)
    : `<p class="text-center py-8"><img src="${imagePath}" alt="${koreanDate} 식단표" class="rounded-xl max-w-full"></p>`;

  // HTML 콘텐츠 생성 (인라인 스타일 - 티스토리 호환)
  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="keywords" content="${tags.join(', ')}">
    <meta name="author" content="센텀밥집">
    <!-- Open Graph / SNS 공유 최적화 -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:site_name" content="센텀밥집">
    <meta property="og:locale" content="ko_KR">
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; }
        body {
            font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #f8fafc;
            padding: 20px;
            margin: 0;
            line-height: 1.6;
            color: #1f2937;
        }
        a { color: #f97316; text-decoration: none; }
        a:hover { color: #ea580c; }
    </style>
</head>
<body>

    <div style="max-width: 900px; margin: 0 auto;">
        <!-- 헤더 -->
        <header style="margin-bottom: 40px; text-align: center;">
            <h1 style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">🍱 오늘의 센텀 식단 안내</h1>
            <p style="color: #6b7280; margin: 0; font-size: 15px;">${koreanDate} ${dayKorean} | 각 식당별 메뉴와 가격을 확인해보세요.</p>
        </header>

        <!-- 응원 메시지 -->
        <div style="background: linear-gradient(to right, #fb923c, #fbbf24); border-radius: 16px; padding: 24px; margin-bottom: 32px; color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <p style="font-size: 17px; font-weight: 500; margin: 0;">💪 ${gptContent?.overview || "오늘도 활기찬 하루 시작하세요!"}</p>
        </div>

        <!-- 메뉴 카드 그리드 -->
        <section style="margin-bottom: 48px;">
            <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 24px 0; display: flex; align-items: center;">
                <span style="background: #f97316; width: 4px; height: 24px; border-radius: 2px; margin-right: 12px; display: inline-block;"></span>
                🍴 오늘의 점심 메뉴
            </h2>
${menuCardsHtml}
        </section>

        <!-- 뉴스 섹션 -->
        <section style="margin-bottom: 48px;">
            <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 24px 0; display: flex; align-items: center;">
                <span style="background: #3b82f6; width: 4px; height: 24px; border-radius: 2px; margin-right: 12px; display: inline-block;"></span>
                📰 오늘의 주요 뉴스
            </h2>
            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">바쁜 직장인분들을 위해 핵심 뉴스만 골라왔습니다.</p>

            <!-- 부산/지역 소식 -->
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 17px; font-weight: 600; color: #374151; margin: 0 0 12px 0;">🏢 부산/지역 소식</h3>
                <div>
${busanNewsHtml || '                <p style="color: #6b7280; text-align: center; padding: 16px 0;">부산 지역 소식이 없습니다.</p>'}
                </div>
            </div>

            <!-- 전국/경제 이슈 -->
            <div>
                <h3 style="font-size: 17px; font-weight: 600; color: #374151; margin: 0 0 12px 0;">🌏 전국/경제 이슈</h3>
                <div>
${nationalNewsHtml || '                <p style="color: #6b7280; text-align: center; padding: 16px 0;">전국 뉴스가 없습니다.</p>'}
                </div>
            </div>
        </section>

        <!-- 스몰토크 섹션 -->
        <section style="margin-bottom: 48px;">
            <h2 style="font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 24px 0; display: flex; align-items: center;">
                <span style="background: #f59e0b; width: 4px; height: 24px; border-radius: 2px; margin-right: 12px; display: inline-block;"></span>
                🗣️ 오늘의 스몰토크 주제
            </h2>
            <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">식사 시간에 가볍게 꺼내기 좋은 주제들입니다.</p>
            <div>
${smallTalkHtml || '                <p style="color: #6b7280; text-align: center; padding: 16px 0;">스몰토크 주제가 없습니다.</p>'}
            </div>
        </section>

        <!-- 푸터 -->
        <footer style="text-align: center; padding: 32px 0; border-top: 1px solid #e5e7eb;">
            <p style="color: #4b5563; margin: 0 0 16px 0;">맛있는 점심 드시고 오후 업무도 화이팅하세요! 💪</p>
            <div>
                <p style="font-weight: 700; color: #1f2937; margin: 0 0 4px 0;">센텀밥집</p>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">뉴스와 식단을 한 번에 전해드립니다.</p>
                <a href="https://aoperat.github.io/centumbob" style="display: inline-block; color: #f97316; font-weight: 500;">
                    🔗 https://aoperat.github.io/centumbob
                </a>
            </div>
            <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">* 본 식단은 사정에 따라 변경될 수 있습니다.</p>
        </footer>
    </div>

</body>
</html>

<!--
====== 티스토리 에디터용 메타 정보 ======

제목: ${title}
태그: ${tags.join(', ')}
카테고리: 센텀밥집, 센텀식단

-->
`;

  // 파일 저장
  fs.writeFileSync(filePath, htmlContent, 'utf-8');

  return filePath;
}

