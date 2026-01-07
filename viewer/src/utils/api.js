// 백엔드 API 기본 URL
// 개발 환경에서는 localhost, 프로덕션에서는 실제 백엔드 URL 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// 민원 제출
export const submitComplaint = async (complaintData) => {
  const response = await fetch(`${API_BASE_URL}/api/complaints`, {
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
  const url = `${API_BASE_URL}/api/complaints${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '민원 조회 실패');
  }

  return await response.json();
};

// 특정 민원 조회
export const getComplaint = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/complaints/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '민원 조회 실패');
  }

  return await response.json();
};

