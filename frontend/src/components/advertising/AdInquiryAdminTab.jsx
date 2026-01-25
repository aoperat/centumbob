// AdInquiryAdminTab.jsx - 광고문의 관리 탭

import { useState, useEffect } from "react";
import StatusBadge from "../shared/StatusBadge";

const AdInquiryAdminTab = () => {
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [adminResponse, setAdminResponse] = useState("");

  // 광고문의 목록 조회
  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (emailFilter) params.append("email", emailFilter);

      const response = await fetch(
        `http://localhost:9101/api/ad-inquiries?${params.toString()}`
      );
      if (response.ok) {
        const result = await response.json();
        setInquiries(result.data || []);
      }
    } catch (error) {
      console.error("광고문의 조회 오류:", error);
      alert("광고문의 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  // 광고문의 상세 조회
  const fetchInquiryDetail = async (id) => {
    try {
      const response = await fetch(`http://localhost:9101/api/ad-inquiries/${id}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedInquiry(result.data);
        setAdminResponse(result.data.admin_response || "");
      }
    } catch (error) {
      console.error("광고문의 상세 조회 오류:", error);
    }
  };

  // 상태 변경
  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:9101/api/ad-inquiries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        alert("상태가 변경되었습니다.");
        fetchInquiries();
        if (selectedInquiry?.id === id) {
          fetchInquiryDetail(id);
        }
      }
    } catch (error) {
      console.error("상태 변경 오류:", error);
      alert("상태 변경 실패");
    }
  };

  // 관리자 답변 저장
  const saveResponse = async () => {
    if (!selectedInquiry) return;

    try {
      const response = await fetch(
        `http://localhost:9101/api/ad-inquiries/${selectedInquiry.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_response: adminResponse }),
        }
      );

      if (response.ok) {
        alert("답변이 저장되었습니다.");
        fetchInquiryDetail(selectedInquiry.id);
      }
    } catch (error) {
      console.error("답변 저장 오류:", error);
      alert("답변 저장 실패");
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter]);

  // 통계 계산
  const stats = {
    total: inquiries.length,
    pending: inquiries.filter((i) => i.status === "pending").length,
    processing: inquiries.filter((i) => i.status === "processing").length,
    resolved: inquiries.filter((i) => i.status === "resolved").length,
    closed: inquiries.filter((i) => i.status === "closed").length,
    unread: inquiries.filter((i) => !i.is_read).length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">광고문의 관리</h2>
        <p className="text-sm text-slate-600 mt-1">광고문의 조회 및 답변 관리</p>
      </div>

      {/* 필터 및 통계 */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">전체</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">읽지않음</p>
            <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">대기중</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">처리중</p>
            <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">해결됨</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500">종료</p>
            <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기중</option>
            <option value="processing">처리중</option>
            <option value="resolved">해결됨</option>
            <option value="closed">종료</option>
          </select>
          <input
            type="email"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="이메일로 검색"
            className="px-4 py-2 border border-slate-300 rounded-lg flex-1"
          />
          <button
            onClick={fetchInquiries}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            조회
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800">광고문의 목록 ({inquiries.length})</h3>
          {loading ? (
            <p className="text-center py-8 text-slate-500">로딩 중...</p>
          ) : inquiries.length === 0 ? (
            <p className="text-center py-8 text-slate-500">광고문의가 없습니다.</p>
          ) : (
            inquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                onClick={() => fetchInquiryDetail(inquiry.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedInquiry?.id === inquiry.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 hover:border-purple-300 hover:shadow-md"
                } ${!inquiry.is_read ? "bg-yellow-50" : "bg-white"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={inquiry.status} />
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      {inquiry.ad_type}
                    </span>
                    {!inquiry.is_read && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-bold text-slate-800">{inquiry.company_name}</p>
                <p className="text-sm text-slate-600">{inquiry.contact_name}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {inquiry.description}
                </p>
              </div>
            ))
          )}
        </div>

        {/* 상세 */}
        <div>
          {selectedInquiry ? (
            <div className="bg-white p-6 rounded-lg border border-slate-200 sticky top-6">
              <h3 className="font-bold text-slate-800 mb-4">광고문의 상세</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">기업명</p>
                  <p className="text-slate-800">{selectedInquiry.company_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">담당자</p>
                    <p className="text-slate-800">{selectedInquiry.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">광고유형</p>
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      {selectedInquiry.ad_type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">이메일</p>
                    <p className="text-slate-800 text-sm">{selectedInquiry.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">전화번호</p>
                    <p className="text-slate-800">{selectedInquiry.phone}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">문의내용</p>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm">
                    {selectedInquiry.description}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">상태 변경</p>
                  <div className="flex gap-2">
                    {["pending", "processing", "resolved", "closed"].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(selectedInquiry.id, status)}
                        className={`px-3 py-1 rounded text-xs font-bold ${
                          selectedInquiry.status === status
                            ? "bg-purple-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {status === "pending" && "대기중"}
                        {status === "processing" && "처리중"}
                        {status === "resolved" && "해결됨"}
                        {status === "closed" && "종료"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">관리자 답변</p>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="답변을 작성하세요"
                  />
                  <button
                    onClick={saveResponse}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    답변 저장
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg border border-slate-200 text-center text-slate-500">
              광고문의를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdInquiryAdminTab;
