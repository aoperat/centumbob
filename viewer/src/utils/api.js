// Supabase Edge Function URL (서버리스)
// 프로덕션에서는 Supabase Edge Function 사용, 개발 환경에서는 환경 변수 또는 localhost
const SUPABASE_URL = 'https://vaqfjjkwpzrolebvbnbl.supabase.co';
const EDGE_FUNCTION_NAME = 'complaints-api';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`;

let API_BASE_URL = import.meta.env.VITE_API_URL;

// 프로덕션에서는 Supabase Edge Function을 기본값으로 사용
if (import.meta.env.PROD) {
  if (!API_BASE_URL || API_BASE_URL === 'http://localhost:3001') {
    API_BASE_URL = EDGE_FUNCTION_URL; // Supabase Edge Function 사용
  }
} else {
  // 개발 환경: 환경 변수가 있으면 사용, 없으면 localhost
  API_BASE_URL = API_BASE_URL || 'http://localhost:3001';
}

// API URL 검증
const getApiUrl = (endpoint) => {
  if (!API_BASE_URL) {
    throw new Error('백엔드 서버가 설정되지 않았습니다. 관리자에게 문의해주세요.');
  }
  // Edge Function은 /api/complaints 대신 직접 호출
  if (API_BASE_URL.includes('/functions/v1/')) {
    return API_BASE_URL + endpoint.replace('/api/complaints', '');
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

