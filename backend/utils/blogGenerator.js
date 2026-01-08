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
 * Jekyll 블로그 포스트 생성 (센텀 직장인 모닝 브리핑 스타일)
 * @param {Object} params
 * @param {string} params.dateString - "2025-01-05" 형식
 * @param {string} params.koreanDate - "2025년 1월 5일" 형식
 * @param {string} params.imagePath - 이미지 파일 경로 (상대 경로)
 * @param {string} params.postsDir - _posts 폴더 경로
 * @param {Object} params.gptContent - GPT 생성 콘텐츠
 * @returns {string} 생성된 포스트 파일 경로
 */
export function generateJekyllPost({ dateString, koreanDate, imagePath, postsDir, gptContent = null }) {
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

  // Jekyll front matter 생성
  const frontMatter = `---
layout: post
title: "${title}"
date: ${dateString} 08:00:00 +0900
categories: [센텀밥집]
tags: [센텀식단표, 구내식당식단표]
description: "${description}"
image: ${imagePath}
---

👋 좋은 아침입니다, 센텀 직장인 여러분!

## 🍴 오늘의 센텀 점심 식단표 (${koreanDate.split(' ')[1]} ${koreanDate.split(' ')[2]})

![${koreanDate} 식단표](${imagePath})

---

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

    // 해당 요일의 메뉴 추출 (식당별로 구분)
    const restaurantMenus = menuDataList.map(restaurant => {
      const dayMenu = restaurant.menus[day] || { lunch: [], dinner: [] };
      const lunchMenus = dayMenu.lunch || [];
      const dinnerMenus = dayMenu.dinner || [];
      return {
        name: restaurant.restaurant_name,
        lunch: lunchMenus,
        dinner: dinnerMenus,
        allMenus: [...lunchMenus, ...dinnerMenus]
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
 * 티스토리용 HTML 블로그 포스트 생성
 * @param {Object} params
 * @param {string} params.dateString - "2025-01-05" 형식
 * @param {string} params.koreanDate - "2025년 1월 5일" 형식
 * @param {string} params.imagePath - 이미지 파일 경로
 * @param {string} params.postsDir - 저장 폴더 경로
 * @param {Object} params.gptContent - GPT 생성 콘텐츠
 * @returns {string} 생성된 HTML 파일 경로
 */
export function generateTistoryPost({ dateString, koreanDate, imagePath, postsDir, gptContent = null }) {
  // tistory 폴더 생성
  const tistoryDir = path.join(postsDir, 'tistory');
  if (!fs.existsSync(tistoryDir)) {
    fs.mkdirSync(tistoryDir, { recursive: true });
  }

  const title = `[센텀밥집] ${koreanDate} 센텀식단표`;
  const filename = `${dateString}-tistory.html`;
  const filePath = path.join(tistoryDir, filename);

  // 뉴스 섹션 HTML 생성
  const busanNewsHtml = (gptContent?.newsBusan || []).map((item, index) => `
    <p><strong>${index + 1}. ${item.title}</strong><br>
    ${item.content}</p>
  `).join('');

  const nationalNewsHtml = (gptContent?.newsNational || []).map((item, index) => `
    <p><strong>${index + 1}. ${item.title}</strong><br>
    ${item.content}</p>
  `).join('');

  const smallTalkHtml = (gptContent?.smallTalkList || []).map((item, index) => `
    <p><strong>${index + 1}️⃣ ${item.topic}</strong><br>
    : ${item.content}</p>
  `).join('');

  // HTML 콘텐츠 생성 (티스토리 에디터에 복사/붙여넣기 용)
  const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 20px; }
    h2 { color: #333; border-bottom: 2px solid #ff6b35; padding-bottom: 10px; margin-top: 30px; }
    h3 { color: #555; margin-top: 20px; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }
    .highlight { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .news-section { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 40px; padding: 20px; background: #333; color: white; border-radius: 8px; }
    a { color: #ff6b35; text-decoration: none; }
  </style>
</head>
<body>

<p>👋 좋은 아침입니다, 센텀 직장인 여러분!</p>

<h2>🍴 오늘의 센텀 점심 식단표 (${koreanDate.split(' ')[1]} ${koreanDate.split(' ')[2]})</h2>

<p><img src="${imagePath}" alt="${koreanDate} 식단표"></p>

<hr>

<h2>💪 활기찬 하루를 위한 응원 한마디</h2>

<div class="highlight">
<p>${gptContent?.overview || "오늘도 활기찬 하루 시작하세요!"}</p>
</div>

<hr>

<h2>📰 오늘의 주요 뉴스 요약</h2>

<p>바쁜 직장인분들을 위해 핵심 뉴스만 골라왔습니다.</p>

<h3>🏢 [부산/지역 소식]</h3>
<div class="news-section">
${busanNewsHtml || '<p>부산 지역 소식이 없습니다.</p>'}
</div>

<h3>🌏 [전국/경제 이슈]</h3>
<div class="news-section">
${nationalNewsHtml || '<p>전국 뉴스가 없습니다.</p>'}
</div>

<hr>

<h2>🗣️ 오늘의 스몰토크 주제 (3가지)</h2>

<p>식사 시간에 가볍게 꺼내기 좋은 주제들입니다.</p>

<div class="highlight">
${smallTalkHtml || '<p>스몰토크 주제가 없습니다.</p>'}
</div>

<hr>

<p>맛있는 점심 드시고 오후 업무도 화이팅하세요! 💪</p>

<div class="footer">
<p><strong>센텀밥집</strong> - 뉴스와 식단을 한 번에 전해드립니다.</p>
<p>🔗 <a href="https://aoperat.github.io/centumbob" style="color: #ff6b35;">https://aoperat.github.io/centumbob</a></p>
</div>

</body>
</html>

<!--
====== 티스토리 에디터용 (HTML 모드에서 복사) ======

<p>👋 좋은 아침입니다, 센텀 직장인 여러분!</p>

<h2>🍴 오늘의 센텀 점심 식단표 (${koreanDate.split(' ')[1]} ${koreanDate.split(' ')[2]})</h2>

<p>[이미지: 식단표 이미지를 여기에 업로드하세요]</p>

<hr>

<h2>💪 활기찬 하루를 위한 응원 한마디</h2>

<p>${gptContent?.overview || "오늘도 활기찬 하루 시작하세요!"}</p>

<hr>

<h2>📰 오늘의 주요 뉴스 요약</h2>

<p>바쁜 직장인분들을 위해 핵심 뉴스만 골라왔습니다.</p>

<h3>🏢 [부산/지역 소식]</h3>
${busanNewsHtml}

<h3>🌏 [전국/경제 이슈]</h3>
${nationalNewsHtml}

<hr>

<h2>🗣️ 오늘의 스몰토크 주제 (3가지)</h2>

<p>식사 시간에 가볍게 꺼내기 좋은 주제들입니다.</p>

${smallTalkHtml}

<hr>

<p>맛있는 점심 드시고 오후 업무도 화이팅하세요! 💪</p>

<p><strong>센텀밥집</strong> - 뉴스와 식단을 한 번에 전해드립니다.<br>
🔗 <a href="https://aoperat.github.io/centumbob">https://aoperat.github.io/centumbob</a></p>

-->
`;

  // 파일 저장
  fs.writeFileSync(filePath, htmlContent, 'utf-8');

  return filePath;
}

