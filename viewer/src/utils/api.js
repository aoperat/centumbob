// 백엔드 API 기본 URL
// 개발 환경에서는 localhost, 프로덕션에서는 실제 백엔드 URL 사용
let API_BASE_URL = import.meta.env.VITE_API_URL;

// 프로덕션에서 API URL이 없으면 빈 문자열 (에러 처리)
if (import.meta.env.PROD) {
  if (!API_BASE_URL || API_BASE_URL === 'http://localhost:3001') {
    API_BASE_URL = ''; // 프로덕션에서 localhost는 사용하지 않음
    console.warn('⚠️ 백엔드 API URL이 설정되지 않았습니다. 민원 기능이 작동하지 않습니다.');
    console.warn('⚠️ GitHub 저장소 Settings > Secrets > Actions에 VITE_API_URL을 설정하고 재배포해주세요.');
  }
} else {
  // 개발 환경
  API_BASE_URL = API_BASE_URL || 'http://localhost:3001';
}

// API URL 검증
const getApiUrl = (endpoint) => {
  if (!API_BASE_URL) {
    throw new Error('백엔드 서버가 설정되지 않았습니다. 관리자에게 문의해주세요.');
  }
  return `${API_BASE_URL}${endpoint}`;
};

// 민원 제출
export const submitComplaint = async (complaintData) => {
  try {
    const response = await fetch(getApiUrl('/api/complaints'), {
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
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 민원 목록 조회
export const getComplaints = async (filters = {}) => {
  try {
    const { status, restaurant_name, user_email, limit, offset } = filters;
    const params = new URLSearchParams();
    
    if (status) params.append('status', status);
    if (restaurant_name) params.append('restaurant_name', restaurant_name);
    if (user_email) params.append('user_email', user_email);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    const queryString = params.toString();
    const url = getApiUrl(`/api/complaints${queryString ? `?${queryString}` : ''}`);

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '민원 조회 실패');
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

// 특정 민원 조회
export const getComplaint = async (id) => {
  try {
    const response = await fetch(getApiUrl(`/api/complaints/${id}`));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '민원 조회 실패');
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    }
    throw error;
  }
};

