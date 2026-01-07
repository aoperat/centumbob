import { useState, useEffect } from 'react';
import { IconFileText, IconX, IconCheck } from './Icons';
import { submitComplaint, getComplaints } from '../utils/api';

const ComplaintTab = ({ restaurants, dateRanges }) => {
  const [view, setView] = useState('form'); // 'form' | 'list' | 'detail'
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    restaurant_name: restaurants[0] || '',
    date_range: dateRanges[0] || '',
    category: '메뉴',
    title: '',
    content: '',
    user_name: '',
    user_email: ''
  });
  
  // 목록 상태
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [userEmailFilter, setUserEmailFilter] = useState('');

  // 민원 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.restaurant_name || !formData.category || !formData.title || 
        !formData.content || !formData.user_name || !formData.user_email) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await submitComplaint(formData);
      alert('민원이 성공적으로 제출되었습니다.');
      // 폼 초기화
      setFormData({
        restaurant_name: restaurants[0] || '',
        date_range: dateRanges[0] || '',
        category: '메뉴',
        title: '',
        content: '',
        user_name: '',
        user_email: ''
      });
      // 목록 새로고침
      if (formData.user_email) {
        setUserEmailFilter(formData.user_email);
        setView('list');
        loadComplaints(formData.user_email);
      }
    } catch (error) {
      alert(`민원 제출 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 민원 목록 로드
  const loadComplaints = async (email = userEmailFilter) => {
    if (!email) {
      alert('이메일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const filters = { user_email: email };
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
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
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <IconFileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">민원 제출 및 조회</h2>
              <p className="text-sm text-slate-500">식단표 관련 민원을 제출하거나 조회할 수 있습니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('form')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                view === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              민원 제출
            </button>
            <button
              onClick={() => {
                setView('list');
                if (userEmailFilter) {
                  loadComplaints();
                }
              }}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              내 민원 조회
            </button>
          </div>
        </div>

        {/* 민원 제출 폼 */}
        {view === 'form' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">민원 제출</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    식당명 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.restaurant_name}
                    onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    {restaurants.map((restaurant, idx) => (
                      <option key={idx} value={restaurant}>{restaurant}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    날짜 범위
                  </label>
                  <select
                    value={formData.date_range}
                    onChange={(e) => setFormData({ ...formData, date_range: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">선택 안함</option>
                    {dateRanges.map((date, idx) => (
                      <option key={idx} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['메뉴', '가격', '품질', '기타'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                        formData.category === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="민원 제목을 입력하세요"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="민원 내용을 상세히 입력하세요"
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    작성자 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                    placeholder="이름을 입력하세요"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                    placeholder="이메일을 입력하세요"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? '제출 중...' : '민원 제출'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 민원 목록 */}
        {view === 'list' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">내 민원 조회</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* 필터 */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={userEmailFilter}
                    onChange={(e) => setUserEmailFilter(e.target.value)}
                    placeholder="조회할 이메일을 입력하세요"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
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
                <button
                  onClick={() => loadComplaints()}
                  disabled={isLoading || !userEmailFilter}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '조회 중...' : '조회'}
                </button>
              </div>

              {/* 목록 */}
              {complaints.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  {isLoading ? '조회 중...' : '민원이 없습니다.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setView('detail');
                      }}
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
                          </div>
                          <h4 className="font-bold text-slate-800 mb-1">{complaint.title}</h4>
                          <p className="text-sm text-slate-600 line-clamp-2">{complaint.content}</p>
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

        {/* 민원 상세 */}
        {view === 'detail' && selectedComplaint && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">민원 상세</h3>
              <button
                onClick={() => setView('list')}
                className="text-slate-500 hover:text-slate-700"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getStatusColor(selectedComplaint.status)}`}>
                  {getStatusText(selectedComplaint.status)}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getCategoryColor(selectedComplaint.category)}`}>
                  {selectedComplaint.category}
                </span>
              </div>

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

              <div>
                <h5 className="font-bold text-slate-700 mb-2">민원 내용</h5>
                <div className="p-4 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap">
                  {selectedComplaint.content}
                </div>
              </div>

              {selectedComplaint.admin_response && (
                <div>
                  <h5 className="font-bold text-slate-700 mb-2">관리자 답변</h5>
                  <div className="p-4 bg-blue-50 rounded-lg text-slate-700 whitespace-pre-wrap">
                    {selectedComplaint.admin_response}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setView('list')}
                  className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  목록으로
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintTab;
