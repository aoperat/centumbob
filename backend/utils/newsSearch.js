import dotenv from 'dotenv';
import axios from 'axios';
import { load } from 'cheerio';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Google News RSS에서 뉴스 가져오기
 * @param {string} query - 검색어 (선택)
 * @param {string} region - 지역 (기본: KR)
 * @returns {Promise<Array>} 뉴스 아이템 배열
 */
export async function fetchNews(query = null, region = 'KR') {
  try {
    let url;
    if (query) {
      // 검색어가 있으면 검색 RSS 사용
      url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=${region}&ceid=${region}:ko`;
    } else {
      // 기본 뉴스 RSS
      url = `https://news.google.com/rss?hl=ko&gl=${region}&ceid=${region}:ko`;
    }

    const response = await axios.get(url, { timeout: 10000 });
    const $ = load(response.data, { xmlMode: true });

    const items = [];
    $("item").each((i, elem) => {
      if (i < 20) {
        items.push({
          title: $(elem).find("title").text(),
          link: $(elem).find("link").text(),
          pubDate: $(elem).find("pubDate").text(),
          source: $(elem).find("source").text(),
        });
      }
    });
    return items;
  } catch (error) {
    console.error("뉴스 가져오기 오류:", error.message);
    return [];
  }
}

/**
 * 부산 날씨 정보 가져오기 (OpenWeatherMap 또는 GPT)
 * @returns {Promise<string>} 날씨 정보
 */
export async function fetchBusanWeather() {
  try {
    // OpenWeatherMap API가 있으면 사용, 없으면 GPT로 대체
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (apiKey) {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=Busan,KR&appid=${apiKey}&units=metric&lang=kr`,
        { timeout: 5000 }
      );
      const data = response.data;
      const temp = Math.round(data.main.temp);
      const feelsLike = Math.round(data.main.feels_like);
      const description = data.weather[0].description;
      const humidity = data.main.humidity;

      return `현재 부산 기온 ${temp}°C (체감 ${feelsLike}°C), ${description}, 습도 ${humidity}%`;
    } else {
      // API 키가 없으면 GPT에게 현재 날짜 기준으로 부산 날씨 예상 요청
      const today = new Date();
      const month = today.getMonth() + 1;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `오늘은 ${month}월입니다. 부산의 이 시기 평균적인 날씨와 기온을 간단히 알려주세요.
            형식: "부산 오늘 날씨: 맑음/흐림/비 등, 기온 약 X°C, 간단한 옷차림 조언" (1문장)`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error("날씨 정보 가져오기 오류:", error.message);
    return "날씨 정보를 가져올 수 없습니다.";
  }
}

/**
 * 블로그용 뉴스 데이터 수집 (GPT로 요약/정리)
 * @returns {Promise<Object>} 블로그용 뉴스 데이터
 */
export async function fetchBlogNewsData() {
  console.log('[뉴스 수집] 블로그용 뉴스 데이터 수집 시작...');

  try {
    // 병렬로 여러 뉴스 소스 가져오기
    const [
      busanNews,
      nationalNews,
      entertainmentNews,
      weatherInfo
    ] = await Promise.all([
      fetchNews('부산'),
      fetchNews(),  // 전국 뉴스
      fetchNews('연예 OR 스포츠 OR 트렌드'),
      fetchBusanWeather()
    ]);

    console.log(`[뉴스 수집] 부산: ${busanNews.length}건, 전국: ${nationalNews.length}건, 연예: ${entertainmentNews.length}건`);

    // 뉴스가 없으면 기본값 반환
    if (busanNews.length === 0 && nationalNews.length === 0) {
      console.warn('[뉴스 수집] 뉴스를 가져올 수 없습니다. 기본값 반환');
      return {
        weather: weatherInfo,
        busanNews: "부산 지역 뉴스를 가져올 수 없습니다.",
        nationalNews: "전국 뉴스를 가져올 수 없습니다.",
        lightNews: "가벼운 소식을 가져올 수 없습니다.",
        smallTalk: "스몰토크 주제를 생성할 수 없습니다."
      };
    }

    // GPT에게 뉴스 정리 요청
    const busanNewsText = busanNews.slice(0, 10).map((n, i) => `${i+1}. [${n.source}] ${n.title}`).join('\n');
    const nationalNewsText = nationalNews.slice(0, 15).map((n, i) => `${i+1}. [${n.source}] ${n.title}`).join('\n');
    const entertainmentNewsText = entertainmentNews.slice(0, 10).map((n, i) => `${i+1}. [${n.source}] ${n.title}`).join('\n');

    const prompt = `오늘의 뉴스 헤드라인입니다:

[부산/지역 뉴스]
${busanNewsText || "뉴스 없음"}

[전국 주요 뉴스]
${nationalNewsText || "뉴스 없음"}

[연예/스포츠/트렌드]
${entertainmentNewsText || "뉴스 없음"}

위 뉴스를 바탕으로 직장인 점심시간 블로그에 적합하게 정리해주세요.

⚠️ 규칙:
- 정치 관련 뉴스는 제외
- 너무 무겁거나 부정적인 뉴스는 가볍게 다루기
- 직장인이 관심 가질 만한 내용 위주로 선별
- 각 항목은 제목과 함께 2-3문장으로 상세 내용 작성

JSON 형식으로 응답:
{
  "busan_news": [
    { "title": "뉴스 제목", "content": "상세 내용 2-3문장" },
    { "title": "뉴스 제목", "content": "상세 내용 2-3문장" },
    { "title": "뉴스 제목", "content": "상세 내용 2-3문장" }
  ],
  "national_news": [
    { "title": "전국/경제 뉴스 제목", "content": "상세 내용 2-3문장" },
    { "title": "전국/경제 뉴스 제목", "content": "상세 내용 2-3문장" },
    { "title": "전국/경제 뉴스 제목", "content": "상세 내용 2-3문장" }
  ],
  "light_news": [
    { "title": "가벼운 이슈 제목", "content": "재미있게 풀어쓴 내용 2-3문장" }
  ],
  "small_talk": [
    { "topic": "스몰토크 주제 1", "content": "대화 소재가 될 만한 내용" },
    { "topic": "스몰토크 주제 2", "content": "대화 소재가 될 만한 내용" },
    { "topic": "스몰토크 주제 3", "content": "대화 소재가 될 만한 내용" }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "당신은 직장인 대상 라이프스타일 블로그 에디터입니다. 뉴스를 친근하고 유익하게 정리합니다."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const parsedNews = JSON.parse(response.choices[0].message.content);

    console.log('[뉴스 수집] GPT 뉴스 정리 완료');

    // blogGenerator에서 사용하는 형식으로 변환
    return {
      weather: weatherInfo,
      busanNews: parsedNews.busan_news || [],
      nationalNews: parsedNews.national_news || [],
      lightNews: parsedNews.light_news || [],
      smallTalk: parsedNews.small_talk || []
    };

  } catch (error) {
    console.error('[뉴스 수집] 오류:', error);
    return {
      weather: "날씨 정보를 가져올 수 없습니다.",
      busanNews: [],
      nationalNews: [],
      lightNews: [],
      smallTalk: []
    };
  }
}

/**
 * 뉴스 요약 (기존 함수 - 호환성 유지)
 */
export async function summarizeNews(newsItems) {
  if (newsItems.length === 0) return "No news found to summarize.";

  const newsText = newsItems
    .map(
      (item, index) =>
        `${index + 1}. [${item.source}] ${item.title} (${item.pubDate})`
    )
    .join("\n");

  const prompt = `
    Here are the top news headlines for today in Korea:
    ${newsText}

    Please perform the following tasks:
    1. **Filter out** any news items related to **Politics** (domestic or international), political parties, or politicians.
    2. **Group** the remaining news items by topic (e.g., Economy, Society, Technology/Science, Culture/Entertainment, Sports, International (non-political)).
    3. Provide a concise summary for each group in Korean.
    4. **Crucially**, for each summary point, include its **date** and **source** (e.g., [YYYY-MM-DD] [Source Name]).

    Format the output as follows:

    ## [Topic Name]
    - [Date] [Source] Summary point 1
    - [Date] [Source] Summary point 2
    ...
    `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful news assistant." },
        { role: "user", content: prompt },
      ],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI API 오류:", error);
    return "Failed to generate summary.";
  }
}

// CLI로 직접 실행시
const isMainModule = process.argv[1] && process.argv[1].includes('newsSearch');
if (isMainModule) {
  (async () => {
    console.log("블로그용 뉴스 데이터 수집 중...\n");
    const newsData = await fetchBlogNewsData();
    console.log("\n--- 수집된 뉴스 데이터 ---\n");
    console.log(JSON.stringify(newsData, null, 2));
  })();
}

export default {
  fetchNews,
  fetchBusanWeather,
  fetchBlogNewsData,
  summarizeNews
};
