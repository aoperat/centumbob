import { isSupabaseStoragePath, getPublicUrl } from "./supabaseStorage.js";

// 가격 포맷팅 함수: 숫자만 있으면 "7,000원" 형식으로 변환
export const formatPrice = (price) => {
  if (!price) return "";

  const priceStr = String(price).trim();

  // 이미 "원"이 붙어있으면 숫자 부분만 포맷팅
  if (priceStr.includes('원')) {
    // 숫자만 추출
    const numOnly = priceStr.replace(/[^0-9]/g, '');
    if (numOnly) {
      const formatted = Number(numOnly).toLocaleString('ko-KR');
      return `${formatted}원`;
    }
    return priceStr;
  }

  // 숫자만 있는 경우 (7000, "7000" 등)
  const numOnly = priceStr.replace(/[^0-9]/g, '');
  if (numOnly && numOnly === priceStr.replace(/,/g, '')) {
    const formatted = Number(numOnly).toLocaleString('ko-KR');
    return `${formatted}원`;
  }

  // 그 외의 경우 그대로 반환
  return priceStr;
};

// 데이터 변환 함수: 관리자 형식 → 뷰어 형식
export const transformDataForViewer = (adminData) => {
  const { name, date, price, menus } = adminData;
  
  // 메뉴 데이터 변환: lunch/dinner → 점심/저녁
  const transformedMenus = {};
  const days = ["월", "화", "수", "목", "금"];
  
  days.forEach(day => {
    const dayMenu = menus[day] || { lunch: [], dinner: [] };
    transformedMenus[day] = {
      "점심": dayMenu.lunch || [],
      "저녁": dayMenu.dinner || []
    };
  });

  return {
    name,
    type: "text",
    price: {
      lunch: price?.lunch || "",
      dinner: price?.dinner || ""
    },
    data: {
      date: date || "",
      menus: transformedMenus,
      text: ""
    },
    imageUrls: []
  };
};

// DB 데이터를 뷰어 형식으로 변환
// restaurantInfo: 기준데이터(restaurants 테이블)의 가격 정보
export const transformDbDataForViewer = (dbData, imageBase64 = null, restaurantInfo = null) => {
  const { restaurant_id, restaurant_name, date_range, price_lunch, price_dinner, menus, image_path, image_paths } = dbData;

  // 메뉴 데이터 변환: lunch/dinner → 점심/저녁
  const transformedMenus = {};
  const days = ["월", "화", "수", "목", "금"];

  days.forEach(day => {
    const dayMenu = menus[day] || { lunch: [], dinner: [] };
    transformedMenus[day] = {
      "점심": dayMenu.lunch || [],
      "저녁": dayMenu.dinner || []
    };
  });

  // 이미지 URL 생성
  // 요일별 이미지가 있으면 요일별로 처리, 없으면 전체 요일 모드로 처리
  const imageUrls = [];
  const imageUrlsByDay = {}; // 요일별 이미지 URL

  // 이미지 경로를 viewer용 URL로 변환하는 헬퍼
  const toViewerImageUrl = (imgPath) => {
    if (!imgPath) return null;
    if (isSupabaseStoragePath(imgPath)) {
      return getPublicUrl(imgPath);
    }
    // legacy 경로: 파일명 추출 후 images/ 프리픽스
    const imageFileName = imgPath.split(/[/\\]/).pop();
    return `images/${imageFileName}`;
  };

  // 요일별 이미지 처리
  if (image_paths) {
    days.forEach(day => {
      if (image_paths[day]) {
        const dayImageUrl = toViewerImageUrl(image_paths[day]);
        if (dayImageUrl) {
          imageUrlsByDay[day] = dayImageUrl;
          // 하위 호환성: 첫 번째 이미지를 imageUrls에 추가
          if (imageUrls.length === 0) {
            imageUrls.push(dayImageUrl);
          }
        }
      }
    });
  }

  // 전체 요일 모드: 하나의 이미지
  if (imageUrls.length === 0) {
    if (imageBase64) {
      // base64 인코딩된 이미지 사용
      imageUrls.push(imageBase64);
    } else if (image_path) {
      const url = toViewerImageUrl(image_path);
      if (url) imageUrls.push(url);
    }
  }

  // 가격 결정: 기준데이터(restaurantInfo) 우선, 없으면 menu_data의 가격 사용
  const finalPriceLunch = restaurantInfo?.price_lunch || price_lunch || "";
  const finalPriceDinner = restaurantInfo?.price_dinner || price_dinner || "";

  // 건물명: 기준데이터(restaurantInfo)에서 가져옴
  const buildingName = restaurantInfo?.building_name || "";

  // sort_order: 기준데이터(restaurantInfo)에서 가져옴
  const sortOrder = restaurantInfo?.sort_order || 999;

  // 지도 URL: 기준데이터(restaurantInfo)에서 가져옴
  const mapUrl = restaurantInfo?.map_url || null;
  const directionsUrl = restaurantInfo?.directions_url || null;

  return {
    id: restaurant_id,
    name: restaurant_name,
    building_name: buildingName,
    sort_order: sortOrder,
    type: "text",
    price: {
      lunch: formatPrice(finalPriceLunch),
      dinner: formatPrice(finalPriceDinner)
    },
    data: {
      date: date_range || "",
      menus: transformedMenus,
      text: ""
    },
    // 위치 정보
    location: {
      latitude: restaurantInfo?.latitude || null,
      longitude: restaurantInfo?.longitude || null,
      address: restaurantInfo?.address || null,
      map_url: mapUrl,
      directions_url: directionsUrl,
    },
    imageUrls: imageUrls, // 하위 호환성: 전체 요일 모드용
    imageUrlsByDay: Object.keys(imageUrlsByDay).length > 0 ? imageUrlsByDay : undefined // 요일별 이미지
  };
};

