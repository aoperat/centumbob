import { useState } from "react";
import { IconX } from "./Icons";
import { submitAdInquiry, getAdInquiries, getAdInquiry } from "../utils/api";

const AdInquiryModal = ({ isOpen, onClose }) => {
  const [view, setView] = useState("form"); // 'form' | 'list' | 'detail'
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    ad_type: "배너",
    description: "",
  });

  // 목록 상태
  const [inquiries, setInquiries] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");

  // 상세 보기에서 최신 데이터 로드
  const loadInquiryDetail = async (id) => {
    if (!id) return null;
    try {
      const result = await getAdInquiry(id);
      return result.data;
    } catch (error) {
      console.error("광고문의 상세 조회 실패:", error);
      return null;
    }
  };

  // 광고문의 제출
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.company_name ||
      !formData.contact_name ||
      !formData.email ||
      !formData.phone ||
      !formData.ad_type ||
      !formData.description
    ) {
      alert("모든 필수 항목을 입력해주세요.");
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    // 제출 전에 이메일 저장
    const userEmail = formData.email;

    setIsLoading(true);
    try {
      await submitAdInquiry(formData);
      alert("광고문의가 성공적으로 제출되었습니다.");
      // 폼 초기화
      setFormData({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        ad_type: "배너",
        description: "",
      });
      // 저장해둔 이메일로 목록 새로고침
      if (userEmail) {
        setEmailFilter(userEmail);
        setView("list");
        loadInquiries(userEmail);
      }
    } catch (error) {
      let errorMessage = error.message;
      if (
        errorMessage.includes("백엔드 서버") ||
        errorMessage.includes("연결할 수 없습니다")
      ) {
        errorMessage =
          "백엔드 서버에 연결할 수 없습니다.\n\n현재 광고문의 기능을 사용할 수 없습니다.\n관리자에게 문의해주세요.";
      }
      alert(`광고문의 제출 실패: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 광고문의 목록 로드
  const loadInquiries = async (email = emailFilter) => {
    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const filters = { email: email };
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }
      const result = await getAdInquiries(filters);
      setInquiries(result.data || []);
    } catch (error) {
      let errorMessage = error.message;
      if (
        errorMessage.includes("백엔드 서버") ||
        errorMessage.includes("연결할 수 없습니다")
      ) {
        errorMessage =
          "백엔드 서버에 연결할 수 없습니다.\n\n현재 광고문의 조회 기능을 사용할 수 없습니다.\n관리자에게 문의해주세요.";
      }
      alert(`광고문의 조회 실패: ${errorMessage}`);
      setInquiries([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "processing":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-300";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "processing":
        return "처리중";
      case "resolved":
        return "해결됨";
      case "closed":
        return "종료";
      default:
        return status;
    }
  };

  const getAdTypeColor = (ad_type) => {
    switch (ad_type) {
      case "배너":
        return "bg-purple-100 text-purple-700";
      case "협찬":
        return "bg-orange-100 text-orange-700";
      case "팝업":
        return "bg-red-100 text-red-700";
      case "기타":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b border-slate-200 gap-2">
          <h2 className="text-base sm:text-xl font-bold text-slate-800">
            광고문의
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setView("form")}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                view === "form"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              문의하기
            </button>
            <button
              onClick={() => {
                setView("list");
                if (emailFilter) {
                  loadInquiries();
                }
              }}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                view === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              내 문의 조회
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <IconX />
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {/* 광고문의 제출 폼 */}
          {view === "form" && (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    기업명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="회사명을 입력하세요"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    담당자명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="담당자명을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      // 숫자만 입력 가능 (하이픈 자동 제거)
                      const numbersOnly = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, phone: numbersOnly });
                    }}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="01012345678 (숫자만 입력)"
                    maxLength="11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  광고 유형 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["배너", "협찬", "팝업", "기타"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, ad_type: type })}
                      className={`py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                        formData.ad_type === type
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                  상세 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={5}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="광고 문의 내용을 상세히 작성해주세요"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isLoading ? "제출 중..." : "광고문의 제출"}
              </button>
            </form>
          )}

          {/* 광고문의 목록 */}
          {view === "list" && (
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    이메일로 조회
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailFilter}
                      onChange={(e) => setEmailFilter(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => loadInquiries()}
                      disabled={isLoading}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap"
                    >
                      {isLoading ? "조회중..." : "조회"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                    상태 필터
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    <option value="pending">대기중</option>
                    <option value="processing">처리중</option>
                    <option value="resolved">해결됨</option>
                    <option value="closed">종료</option>
                  </select>
                </div>
              </div>

              {inquiries.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-slate-500 text-sm sm:text-base">
                  조회된 광고문의가 없습니다.
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {inquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      onClick={async () => {
                        const detail = await loadInquiryDetail(inquiry.id);
                        if (detail) {
                          setSelectedInquiry(detail);
                          setView("detail");
                        }
                      }}
                      className="p-3 sm:p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(
                              inquiry.status
                            )}`}
                          >
                            {getStatusText(inquiry.status)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${getAdTypeColor(
                              inquiry.ad_type
                            )}`}
                          >
                            {inquiry.ad_type}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm sm:text-base">
                          {inquiry.company_name}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                          {inquiry.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 광고문의 상세 */}
          {view === "detail" && selectedInquiry && (
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => setView("list")}
                className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1"
              >
                ← 목록으로
              </button>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 sm:pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                        selectedInquiry.status
                      )}`}
                    >
                      {getStatusText(selectedInquiry.status)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${getAdTypeColor(
                        selectedInquiry.ad_type
                      )}`}
                    >
                      {selectedInquiry.ad_type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">
                      기업명
                    </p>
                    <p className="text-sm sm:text-base text-slate-800">
                      {selectedInquiry.company_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">
                      담당자명
                    </p>
                    <p className="text-sm sm:text-base text-slate-800">
                      {selectedInquiry.contact_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">
                      이메일
                    </p>
                    <p className="text-sm sm:text-base text-slate-800">
                      {selectedInquiry.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">
                      전화번호
                    </p>
                    <p className="text-sm sm:text-base text-slate-800">
                      {selectedInquiry.phone}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    문의 내용
                  </p>
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm sm:text-base text-slate-800 whitespace-pre-wrap">
                      {selectedInquiry.description}
                    </p>
                  </div>
                </div>

                {selectedInquiry.admin_response && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">
                      관리자 답변
                    </p>
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm sm:text-base text-blue-900 whitespace-pre-wrap">
                        {selectedInquiry.admin_response}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdInquiryModal;
