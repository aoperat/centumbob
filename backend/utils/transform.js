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
  const { restaurant_name, date_range, price_lunch, price_dinner, menus, image_path, image_paths } = dbData;

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
  
  // 요일별 이미지 처리
  if (image_paths) {
    days.forEach(day => {
      if (image_paths[day]) {
        const imageFileName = image_paths[day].split(/[/\\]/).pop();
        const dayImageUrl = `images/${imageFileName}`;
        imageUrlsByDay[day] = dayImageUrl;
        // 하위 호환성: 첫 번째 이미지를 imageUrls에 추가
        if (imageUrls.length === 0) {
          imageUrls.push(dayImageUrl);
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
      // 상대 경로로 이미지 참조 (viewer/public/images/ 폴더에 복사됨)
      const imageFileName = image_path.split(/[/\\]/).pop();
      imageUrls.push(`images/${imageFileName}`);
    }
  }

  // 가격 결정: 기준데이터(restaurantInfo) 우선, 없으면 menu_data의 가격 사용
  const finalPriceLunch = restaurantInfo?.price_lunch || price_lunch || "";
  const finalPriceDinner = restaurantInfo?.price_dinner || price_dinner || "";

  return {
    name: restaurant_name,
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
    imageUrls: imageUrls, // 하위 호환성: 전체 요일 모드용
    imageUrlsByDay: Object.keys(imageUrlsByDay).length > 0 ? imageUrlsByDay : undefined // 요일별 이미지
  };
};

