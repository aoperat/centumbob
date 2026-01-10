// Supabase Edge Function URL (서버리스)
// 프로덕션에서는 Supabase Edge Function 사용, 개발 환경에서는 환경 변수 또는 localhost
const SUPABASE_URL = "https://vaqfjjkwpzrolebvbnbl.supabase.co";
const EDGE_FUNCTION_NAME = "complaints-api";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`;

let API_BASE_URL = import.meta.env.VITE_API_URL;

// 프로덕션과 개발 환경 모두 Supabase Edge Function 사용 (기본값)
// 환경 변수로 다른 URL이 명시적으로 설정된 경우에만 사용
if (
  !API_BASE_URL ||
  API_BASE_URL === "http://localhost:9101" ||
  API_BASE_URL.includes("/api/complaints") ||
  !API_BASE_URL.includes("/functions/v1/")
) {
  // Supabase Edge Function 사용 (서버리스, CORS 문제 없음)
  API_BASE_URL = EDGE_FUNCTION_URL;
}

// API URL 검증 및 엔드포인트 생성
const getApiUrl = (endpoint) => {
  if (!API_BASE_URL) {
    throw new Error(
      "백엔드 서버가 설정되지 않았습니다. 관리자에게 문의해주세요."
    );
  }

  // Edge Function인 경우: /api/complaints 제거하고 직접 경로 사용
  if (API_BASE_URL.includes("/functions/v1/")) {
    // endpoint에서 /api/complaints 제거
    let path = endpoint.replace("/api/complaints", "");
    // /page-views로 시작하는 경우 그대로 사용
    if (path.startsWith("/page-views")) {
      return `${API_BASE_URL}${path}`;
    }
    // 빈 경로면 그대로, 아니면 경로 추가
    if (path === "" || path === "/") {
      return API_BASE_URL;
    }
    return `${API_BASE_URL}${path}`;
  }

  // 일반 백엔드 서버인 경우: /api/complaints 포함
  return `${API_BASE_URL}${endpoint}`;
};

// 민원 제출
export const submitComplaint = async (complaintData) => {
  try {
    const response = await fetch(getApiUrl("/api/complaints"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(complaintData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "민원 제출 실패");
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      throw new Error(
        "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
      );
    }
    throw error;
  }
};

// 민원 목록 조회
export const getComplaints = async (filters = {}) => {
  try {
    const { status, restaurant_name, user_email, limit, offset } = filters;
    const params = new URLSearchParams();

    if (status) params.append("status", status);
    if (restaurant_name) params.append("restaurant_name", restaurant_name);
    if (user_email) params.append("user_email", user_email);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);

    const queryString = params.toString();
    const url = getApiUrl(
      `/api/complaints${queryString ? `?${queryString}` : ""}`
    );

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "민원 조회 실패");
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      throw new Error(
        "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
      );
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
      throw new Error(error.error || "민원 조회 실패");
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      throw new Error(
        "백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
      );
    }
    throw error;
  }
};

// ==================== 방문자수 관련 API ====================

// 방문자수 조회
export const getPageViews = async (pagePath = "/centumbob/") => {
  try {
    const url = getApiUrl(
      `/page-views?page_path=${encodeURIComponent(pagePath)}`
    );
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "방문자수 조회 실패");
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      throw new Error("백엔드 서버에 연결할 수 없습니다.");
    }
    throw error;
  }
};

// 방문자수 증가
export const incrementPageView = async (pagePath = "/centumbob/") => {
  try {
    const url = getApiUrl("/page-views/increment");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_path: pagePath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "방문자수 증가 실패");
    }

    return await response.json();
  } catch (error) {
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      // 방문자수 증가 실패는 조용히 처리 (사용자 경험 방해 안 함)
      console.warn("방문자수 증가 실패:", error.message);
      return null;
    }
    throw error;
  }
};
