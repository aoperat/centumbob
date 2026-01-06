export const analyzeImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('이미지 분석 실패');
  }

  return await response.json();
};

export const loadMenuData = async (restaurant, date) => {
  try {
    const response = await fetch(`/api/load?restaurant=${encodeURIComponent(restaurant)}&date=${encodeURIComponent(date)}`);

    // 404는 데이터가 없는 정상적인 경우이므로 조용히 처리
    if (response.status === 404) {
      return null; // 데이터가 없으면 null 반환 (콘솔 오류 없음)
    }

    if (!response.ok) {
      // 404가 아닌 다른 오류는 에러로 처리
      try {
        const error = await response.json();
        throw new Error(error.error || '데이터 불러오기 실패');
      } catch (parseError) {
        throw new Error('데이터 불러오기 실패');
      }
    }

    const data = await response.json();
    // 빈 데이터인 경우 null 반환
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return data;
  } catch (error) {
    // 네트워크 오류나 서버 연결 실패 시 null 반환 (데이터 없음으로 처리)
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return null; // 콘솔 경고 제거 - 조용히 처리
    }
    throw error;
  }
};

export const saveMenuData = async (menuData, imageFile) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify(menuData));
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await fetch('/api/save', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '데이터 저장 실패');
  }

  return await response.json();
};

export const publishMenuData = async () => {
  const response = await fetch('/api/publish', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '데이터 게시 실패');
  }

  return await response.json();
};

