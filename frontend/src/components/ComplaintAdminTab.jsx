import { useState, useEffect } from 'react';
import { IconX, IconCheck } from './Icons';
import { getComplaints, updateComplaint } from '../utils/api';

const ComplaintAdminTab = ({ restaurants }) => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  
  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('all');
  const [restaurantFilter, setRestaurantFilter] = useState('all');
  
  // 답변 작성 상태
  const [adminResponse, setAdminResponse] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // 민원 목록 로드
  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const filters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (restaurantFilter !== 'all') {
        filters.restaurant_name = restaurantFilter;
      }
      const result = await getComplaints(filters);
      setComplaints(result.data || []);
    } catch (error) {
      alert(`민원 조회 실패: ${error.message}`);
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 민원 상세 보기
  const handleViewDetail = (complaint) => {
    setSelectedComplaint(complaint);
    setAdminResponse(complaint.admin_response || '');
    setView('detail');
  };

  // 민원 업데이트 (상태 변경 및 답변 작성)
  const handleUpdate = async () => {
    if (!selectedComplaint) return;

    const updateData = {};
    if (adminResponse !== (selectedComplaint.admin_response || '')) {
      updateData.admin_response = adminResponse;
    }

    if (Object.keys(updateData).length === 0) {
      alert('변경사항이 없습니다.');
      return;
    }

    setUpdatingStatus(true);
    try {
      const result = await updateComplaint(selectedComplaint.id, updateData);
      alert('민원이 성공적으로 업데이트되었습니다.');
      // 목록 새로고침
      await loadComplaints();
      // 상세 정보 업데이트
      setSelectedComplaint(result.data);
    } catch (error) {
      alert(`민원 업데이트 실패: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 상태 변경
  const handleStatusChange = async (newStatus) => {
    if (!selectedComplaint) return;

    setUpdatingStatus(true);
    try {
      const result = await updateComplaint(selectedComplaint.id, { status: newStatus });
      alert('상태가 변경되었습니다.');
      // 목록 새로고침
      await loadComplaints();
      // 상세 정보 업데이트
      setSelectedComplaint(result.data);
    } catch (error) {
      alert(`상태 변경 실패: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 컴포넌트 마운트 시 목록 로드
  useEffect(() => {
    loadComplaints();
  }, [statusFilter, restaurantFilter]);

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'processing': return '처리중';
      case 'resolved': return '해결됨';
      case 'closed': return '종료';
      default: return status;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case '메뉴': return 'bg-purple-100 text-purple-700';
      case '가격': return 'bg-orange-100 text-orange-700';
      case '품질': return 'bg-red-100 text-red-700';
      case '기타': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar fade-in bg-slate-50">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">민원 관리</h2>
            <p className="text-sm text-slate-500">제출된 민원을 조회하고 답변할 수 있습니다.</p>
          </div>
          <button
            onClick={loadComplaints}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {/* 목록 뷰 */}
        {view === 'list' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">민원 목록</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* 필터 */}
              <div className="flex gap-4">
                <div className="w-48">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    상태 필터
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    <option value="pending">대기중</option>
                    <option value="processing">처리중</option>
                    <option value="resolved">해결됨</option>
                    <option value="closed">종료</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    식당 필터
                  </label>
                  <select
                    value={restaurantFilter}
                    onChange={(e) => setRestaurantFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    {restaurants.map((restaurant, idx) => (
                      <option key={idx} value={restaurant}>{restaurant}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 통계 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-700 font-bold">대기중</div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {complaints.filter(c => c.status === 'pending').length}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-700 font-bold">처리중</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {complaints.filter(c => c.status === 'processing').length}
                  </div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-700 font-bold">해결됨</div>
                  <div className="text-2xl font-bold text-green-800">
                    {complaints.filter(c => c.status === 'resolved').length}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-700 font-bold">전체</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {complaints.length}
                  </div>
                </div>
              </div>

              {/* 목록 */}
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">조회 중...</div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-12 text-slate-500">민원이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      onClick={() => handleViewDetail(complaint)}
                      className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(complaint.status)}`}>
                              {getStatusText(complaint.status)}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getCategoryColor(complaint.category)}`}>
                              {complaint.category}
                            </span>
                            <span className="text-sm text-slate-500">{complaint.restaurant_name}</span>
                            {complaint.admin_response && (
                              <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                                답변완료
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-800 mb-1">{complaint.title}</h4>
                          <p className="text-sm text-slate-600 line-clamp-2">{complaint.content}</p>
                          <div className="mt-2 text-xs text-slate-500">
                            {complaint.user_name} ({complaint.user_email})
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500 ml-4">
                          <div>{new Date(complaint.created_at).toLocaleDateString('ko-KR')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 상세 뷰 */}
        {view === 'detail' && selectedComplaint && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">민원 상세 및 답변</h3>
              <button
                onClick={() => setView('list')}
                className="text-slate-500 hover:text-slate-700"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 상태 및 카테고리 */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getStatusColor(selectedComplaint.status)}`}>
                  {getStatusText(selectedComplaint.status)}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getCategoryColor(selectedComplaint.category)}`}>
                  {selectedComplaint.category}
                </span>
              </div>

              {/* 상태 변경 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange('pending')}
                  disabled={updatingStatus || selectedComplaint.status === 'pending'}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  대기중
                </button>
                <button
                  onClick={() => handleStatusChange('processing')}
                  disabled={updatingStatus || selectedComplaint.status === 'processing'}
                  className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  처리중
                </button>
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updatingStatus || selectedComplaint.status === 'resolved'}
                  className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  해결됨
                </button>
                <button
                  onClick={() => handleStatusChange('closed')}
                  disabled={updatingStatus || selectedComplaint.status === 'closed'}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  종료
                </button>
              </div>

              {/* 민원 정보 */}
              <div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">{selectedComplaint.title}</h4>
                <div className="text-sm text-slate-500 space-y-1">
                  <div>식당: {selectedComplaint.restaurant_name}</div>
                  {selectedComplaint.date_range && <div>날짜 범위: {selectedComplaint.date_range}</div>}
                  <div>작성자: {selectedComplaint.user_name} ({selectedComplaint.user_email})</div>
                  <div>작성일: {new Date(selectedComplaint.created_at).toLocaleString('ko-KR')}</div>
                  {selectedComplaint.updated_at !== selectedComplaint.created_at && (
                    <div>수정일: {new Date(selectedComplaint.updated_at).toLocaleString('ko-KR')}</div>
                  )}
                </div>
              </div>

              {/* 민원 내용 */}
              <div>
                <h5 className="font-bold text-slate-700 mb-2">민원 내용</h5>
                <div className="p-4 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap">
                  {selectedComplaint.content}
                </div>
              </div>

              {/* 관리자 답변 작성 */}
              <div>
                <h5 className="font-bold text-slate-700 mb-2">관리자 답변</h5>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="관리자 답변을 입력하세요"
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 기존 답변 표시 */}
              {selectedComplaint.admin_response && (
                <div>
                  <h5 className="font-bold text-slate-700 mb-2">기존 답변</h5>
                  <div className="p-4 bg-blue-50 rounded-lg text-slate-700 whitespace-pre-wrap">
                    {selectedComplaint.admin_response}
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setView('list')}
                  className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  목록으로
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updatingStatus}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingStatus ? '저장 중...' : '답변 저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintAdminTab;
