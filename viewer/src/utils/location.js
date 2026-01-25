/**
 * 두 지점 간의 거리 계산 (Haversine formula)
 * @param {number} lat1 - 시작점 위도
 * @param {number} lon1 - 시작점 경도
 * @param {number} lat2 - 도착점 위도
 * @param {number} lon2 - 도착점 경도
 * @returns {number} - 거리 (미터)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
};

/**
 * 거리를 사람이 읽기 쉬운 형식으로 변환
 * @param {number} meters - 거리 (미터)
 * @returns {string} - 포맷된 거리 문자열
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * 사용자의 현재 위치 가져오기
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = '위치 정보를 가져올 수 없습니다.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '위치 권한이 거부되었습니다.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            message = '위치 정보 요청 시간이 초과되었습니다.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5분 동안 캐시된 위치 사용
      }
    );
  });
};

/**
 * 메뉴 데이터에 거리 정보 추가
 * @param {Array} menuData - 메뉴 데이터 배열
 * @param {Object} userLocation - 사용자 위치 {latitude, longitude}
 * @returns {Array} - 거리 정보가 추가된 메뉴 데이터
 */
export const addDistanceToMenuData = (menuData, userLocation) => {
  if (!userLocation) return menuData;

  return menuData.map((item) => {
    if (item.location?.latitude && item.location?.longitude) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.location.latitude,
        item.location.longitude
      );

      return {
        ...item,
        distance: distance,
        distanceText: formatDistance(distance),
      };
    }
    return item;
  });
};

/**
 * Naver Map URL 생성
 * @param {number} latitude - 위도
 * @param {number} longitude - 경도
 * @param {string} buildingName - 건물명 (예: "부산영상산업센터")
 * @param {string} address - 주소
 * @returns {string} - Naver Map URL
 */
export const getNaverMapUrl = (latitude, longitude, buildingName, address) => {
  // 건물명이 있으면 건물명으로 검색, 없으면 주소로 검색
  const searchText = buildingName || address || '위치';
  const encodedName = encodeURIComponent(searchText);
  return `https://map.naver.com/p/search/${encodedName}?c=${longitude},${latitude},18,0,0,0,dh`;
};

/**
 * 길찾기 URL 생성
 * @param {number} latitude - 목적지 위도
 * @param {number} longitude - 목적지 경도
 * @param {string} buildingName - 건물명 (예: "부산영상산업센터")
 * @param {string} address - 주소
 * @returns {string} - Naver Map 길찾기 URL
 */
export const getDirectionsUrl = (latitude, longitude, buildingName, address) => {
  // 건물명이 있으면 건물명으로 검색, 없으면 주소로 검색
  const searchText = buildingName || address || '목적지';
  const encodedName = encodeURIComponent(searchText);
  // Naver Map 길찾기 (도착지만 설정, 출발지는 '내 위치'로 자동 설정됨)
  return `https://map.naver.com/p/directions/-/${latitude},${longitude},${encodedName}/-/car?c=${longitude},${latitude},15,0,0,0,dh`;
};
