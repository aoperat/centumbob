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

// ==================== 민원 관련 API ====================
// Supabase Edge Function 사용 (서버리스) 또는 로컬 백엔드

// Edge Function URL (환경 변수로 오버라이드 가능)
const SUPABASE_EDGE_FUNCTION_URL = import.meta.env.VITE_COMPLAINTS_API_URL || 
  'https://vaqfjjkwpzrolebvbnbl.supabase.co/functions/v1/complaints-api';

// 로컬 백엔드 URL (개발 환경)
const LOCAL_API_URL = 'http://localhost:3001';

// API URL 결정: 환경 변수가 있으면 사용, 없으면 Edge Function 또는 로컬
const getComplaintsApiUrl = () => {
  if (import.meta.env.VITE_COMPLAINTS_API_URL) {
    return import.meta.env.VITE_COMPLAINTS_API_URL;
  }
  // 개발 환경에서는 로컬 백엔드 우선, 없으면 Edge Function
  return import.meta.env.DEV ? LOCAL_API_URL : SUPABASE_EDGE_FUNCTION_URL;
};

const COMPLAINTS_API_BASE = getComplaintsApiUrl();

// Edge Function인지 로컬 백엔드인지 확인
const isEdgeFunction = COMPLAINTS_API_BASE.includes('/functions/v1/');

// API 엔드포인트 생성
const getComplaintsEndpoint = (path = '') => {
  if (isEdgeFunction) {
    // Edge Function은 /api/complaints 없이 직접 호출
    return `${COMPLAINTS_API_BASE}${path}`;
  }
  // 로컬 백엔드는 /api/complaints 포함
  return `${COMPLAINTS_API_BASE}/api/complaints${path}`;
};

// 민원 제출
export const submitComplaint = async (complaintData) => {
  const response = await fetch(getComplaintsEndpoint(''), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(complaintData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '민원 제출 실패');
  }

  return await response.json();
};

// 민원 목록 조회
export const getComplaints = async (filters = {}) => {
  const { status, restaurant_name, user_email, limit, offset } = filters;
  const params = new URLSearchParams();
  
  if (status) params.append('status', status);
  if (restaurant_name) params.append('restaurant_name', restaurant_name);
  if (user_email) params.append('user_email', user_email);
  if (limit) params.append('limit', limit);
  if (offset) params.append('offset', offset);

  const queryString = params.toString();
  const url = getComplaintsEndpoint(queryString ? `?${queryString}` : '');

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '민원 조회 실패');
  }

  return await response.json();
};

// 특정 민원 조회
export const getComplaint = async (id) => {
  const response = await fetch(getComplaintsEndpoint(`/${id}`));

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '민원 조회 실패');
  }

  return await response.json();
};

// 민원 업데이트 (관리자용)
export const updateComplaint = async (id, updateData) => {
  const response = await fetch(getComplaintsEndpoint(`/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '민원 업데이트 실패');
  }

  return await response.json();
};

// ==================== 식당 관리 API ====================

// 식당 목록 조회
export const getRestaurants = async (activeOnly = false) => {
  const url = activeOnly ? '/api/restaurants?active_only=true' : '/api/restaurants';
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '식당 목록 조회 실패');
  }

  return await response.json();
};

// 식당 추가
export const addRestaurant = async (restaurantData) => {
  const response = await fetch('/api/restaurants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(restaurantData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '식당 추가 실패');
  }

  return await response.json();
};

// 식당 수정
export const updateRestaurant = async (id, updateData) => {
  const response = await fetch(`/api/restaurants/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '식당 수정 실패');
  }

  return await response.json();
};

// 식당 삭제
export const deleteRestaurant = async (id) => {
  const response = await fetch(`/api/restaurants/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '식당 삭제 실패');
  }

  return await response.json();
};

// ==================== 블로그 생성 API ====================

// 블로그 포스트 생성
export const generateBlogPost = async (day, dateRange) => {
  const response = await fetch('/api/blog/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ day, dateRange }),
  });

  if (!response.ok) {
    // 응답 본문 읽기 시도
    let errorMessage = `블로그 생성 실패 (${response.status})`;
    try {
      const text = await response.text();
      if (text) {
        try {
          const error = JSON.parse(text);
          errorMessage = error.error || error.message || errorMessage;
        } catch (parseError) {
          // JSON이 아니면 원본 텍스트 사용
          errorMessage = text || errorMessage;
        }
      }
    } catch (readError) {
      console.error('응답 읽기 실패:', readError);
      errorMessage = `서버 오류 (${response.status}): 응답을 읽을 수 없습니다`;
    }
    throw new Error(errorMessage);
  }

  // 성공 응답 파싱
  try {
    const text = await response.text();
    if (!text) {
      throw new Error('서버에서 빈 응답을 받았습니다');
    }
    return JSON.parse(text);
  } catch (parseError) {
    console.error('응답 JSON 파싱 실패:', parseError);
    throw new Error('서버 응답을 파싱할 수 없습니다');
  }
};

