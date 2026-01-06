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
export const transformDbDataForViewer = (dbData) => {
  const { restaurant_name, date_range, price_lunch, price_dinner, menus, image_path } = dbData;
  
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
  const imageUrls = [];
  if (image_path) {
    imageUrls.push(`/api/images/${encodeURIComponent(restaurant_name)}/${encodeURIComponent(date_range)}`);
  }

  return {
    name: restaurant_name,
    type: "text",
    price: {
      lunch: price_lunch || "",
      dinner: price_dinner || ""
    },
    data: {
      date: date_range || "",
      menus: transformedMenus,
      text: ""
    },
    imageUrls: imageUrls
  };
};

