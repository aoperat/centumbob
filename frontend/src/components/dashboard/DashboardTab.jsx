// DashboardTab.jsx - 관리자 대시보드

import { useState, useEffect } from "react";
import AdminCard from "../shared/AdminCard";
import StatusBadge from "../shared/StatusBadge";

const DashboardTab = ({ onTabChange }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [recentAdInquiries, setRecentAdInquiries] = useState([]);

  // 대시보드 데이터 가져오기
  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:9101/api/admin/dashboard-summary");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
        }
      }
    } catch (error) {
      console.error("대시보드 데이터 조회 오류:", error);
    }
  };

  // 최근 민원 가져오기
  const fetchRecentComplaints = async () => {
    try {
      const response = await fetch("http://localhost:9101/api/complaints?limit=3&offset=0");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRecentComplaints(result.data || []);
        }
      }
    } catch (error) {
      console.error("최근 민원 조회 오류:", error);
    }
  };

  // 최근 광고문의 가져오기
  const fetchRecentAdInquiries = async () => {
    try {
      const response = await fetch("http://localhost:9101/api/ad-inquiries?limit=3&offset=0");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRecentAdInquiries(result.data || []);
        }
      }
    } catch (error) {
      console.error("최근 광고문의 조회 오류:", error);
    }
  };

  // 초기 로드 및 자동 갱신
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchRecentComplaints(),
        fetchRecentAdInquiries(),
      ]);
      setLoading(false);
    };

    loadData();

    // 30초마다 자동 갱신
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600">대시보드 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">대시보드</h2>
          <p className="text-sm text-slate-600 mt-1">시스템 전체 현황</p>
        </div>
        <button
          onClick={() => {
            fetchDashboardData();
            fetchRecentComplaints();
            fetchRecentAdInquiries();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          새로고침
        </button>
      </div>

      {/* 민원 관리 섹션 */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">💬</span>
          민원 관리
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminCard
            title="총 민원"
            value={dashboardData.complaints?.total || 0}
            subtitle={`읽지않음: ${dashboardData.complaints?.unread || 0}건`}
            icon="💬"
            color="blue"
            onClick={() => onTabChange("complaint-admin")}
          />
          <AdminCard
            title="대기중"
            value={dashboardData.complaints?.by_status?.pending || 0}
            subtitle="처리 대기"
            icon="⏳"
            color="yellow"
            onClick={() => onTabChange("complaint-admin")}
          />
          <AdminCard
            title="처리중"
            value={dashboardData.complaints?.by_status?.processing || 0}
            subtitle="진행 중"
            icon="🔄"
            color="blue"
            onClick={() => onTabChange("complaint-admin")}
          />
          <AdminCard
            title="해결됨"
            value={dashboardData.complaints?.by_status?.resolved || 0}
            subtitle="완료됨"
            icon="✅"
            color="green"
            onClick={() => onTabChange("complaint-admin")}
          />
        </div>
      </div>

      {/* 광고 및 채팅 섹션 */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">📢</span>
          광고 및 채팅
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminCard
            title="총 광고문의"
            value={dashboardData.ad_inquiries?.total || 0}
            subtitle={`읽지않음: ${dashboardData.ad_inquiries?.unread || 0}건`}
            icon="📢"
            color="purple"
            onClick={() => onTabChange("ad-admin")}
          />
          <AdminCard
            title="최근 채팅 (7일)"
            value={dashboardData.chat_messages?.recent_7days || 0}
            subtitle="메시지 수"
            icon="💭"
            color="green"
            onClick={() => onTabChange("chat-monitor")}
          />
          <AdminCard
            title="차단된 사용자"
            value={dashboardData.blacklist?.total || 0}
            subtitle="블랙리스트"
            icon="🚫"
            color="red"
            onClick={() => onTabChange("chat-monitor")}
          />
        </div>
      </div>

      {/* 최근 항목들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 민원 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">최근 민원</h3>
          {recentComplaints.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              최근 민원이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {recentComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  onClick={() => onTabChange("complaint-admin")}
                  className="p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={complaint.status} type="complaint" />
                    <span className="text-xs text-slate-500">
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-1">
                    {complaint.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {complaint.restaurant_name} - {complaint.user_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 광고문의 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">최근 광고문의</h3>
          {recentAdInquiries.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              최근 광고문의가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {recentAdInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  onClick={() => onTabChange("ad-admin")}
                  className="p-3 border border-slate-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inquiry.status} type="ad_inquiry" />
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                        {inquiry.ad_type}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-1">
                    {inquiry.company_name}
                  </p>
                  <p className="text-xs text-slate-600">
                    {inquiry.contact_name} - {inquiry.email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
