// ChatMonitorTab.jsx - 채팅 메시지 모니터링 탭

import { useState, useEffect } from "react";

const ChatMonitorTab = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [daysFilter, setDaysFilter] = useState(7);
  const [channelFilter, setChannelFilter] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");

  // 블랙리스트 관리
  const [blacklist, setBlacklist] = useState([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [showAddBlacklist, setShowAddBlacklist] = useState(false);
  const [newBlacklist, setNewBlacklist] = useState({
    ip_address: "",
    anonymous_id: "",
    reason: "",
    notes: "",
    expires_at: "",
  });

  // 채팅 메시지 조회
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: daysFilter,
        limit: 100,
        offset: 0,
      });
      if (channelFilter && channelFilter !== "전체") {
        params.append("channel", channelFilter);
      }

      const response = await fetch(
        `http://localhost:9101/api/admin/chat-messages?${params.toString()}`
      );
      if (response.ok) {
        const result = await response.json();
        setMessages(result.data || []);
      }
    } catch (error) {
      console.error("채팅 메시지 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 블랙리스트 조회
  const fetchBlacklist = async () => {
    setLoadingBlacklist(true);
    try {
      const response = await fetch("http://localhost:9101/api/admin/blacklist");
      if (response.ok) {
        const result = await response.json();
        setBlacklist(result.data || []);
      }
    } catch (error) {
      console.error("블랙리스트 조회 오류:", error);
    } finally {
      setLoadingBlacklist(false);
    }
  };

  // 블랙리스트 추가
  const handleAddBlacklist = async () => {
    if (!newBlacklist.ip_address && !newBlacklist.anonymous_id) {
      alert("IP 주소 또는 익명 ID 중 하나는 입력해야 합니다.");
      return;
    }
    if (!newBlacklist.reason) {
      alert("차단 사유를 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("http://localhost:9101/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBlacklist,
          blocked_by: "admin",
        }),
      });

      if (response.ok) {
        alert("블랙리스트에 추가되었습니다.");
        setShowAddBlacklist(false);
        setNewBlacklist({
          ip_address: "",
          anonymous_id: "",
          reason: "",
          notes: "",
          expires_at: "",
        });
        fetchBlacklist();
      } else {
        const error = await response.json();
        alert(`추가 실패: ${error.message}`);
      }
    } catch (error) {
      console.error("블랙리스트 추가 오류:", error);
      alert("블랙리스트 추가 중 오류가 발생했습니다.");
    }
  };

  // 블랙리스트 활성화/비활성화
  const toggleBlacklistStatus = async (id, currentStatus) => {
    try {
      const response = await fetch(`http://localhost:9101/api/admin/blacklist/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        alert(currentStatus ? "차단이 해제되었습니다." : "차단이 활성화되었습니다.");
        fetchBlacklist();
      } else {
        const error = await response.json();
        alert(`상태 변경 실패: ${error.message}`);
      }
    } catch (error) {
      console.error("블랙리스트 상태 변경 오류:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  // 블랙리스트 삭제
  const deleteBlacklistItem = async (id) => {
    if (!confirm("정말로 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`http://localhost:9101/api/admin/blacklist/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("삭제되었습니다.");
        fetchBlacklist();
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.message}`);
      }
    } catch (error) {
      console.error("블랙리스트 삭제 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchBlacklist();
  }, [daysFilter, channelFilter]);

  // 검색 필터링
  const filteredMessages = messages.filter((msg) => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return (
      msg.content?.toLowerCase().includes(lowerSearch) ||
      msg.display_name?.toLowerCase().includes(lowerSearch) ||
      msg.channel?.toLowerCase().includes(lowerSearch)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">채팅 모니터</h2>
        <p className="text-sm text-slate-600 mt-1">
          최근 채팅 메시지 모니터링 ({messages.length}개)
        </p>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={daysFilter}
          onChange={(e) => setDaysFilter(Number(e.target.value))}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value={1}>오늘</option>
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          <option value="전체">전체 채널</option>
          <option value="삼촌밥차런치펍">삼촌밥차런치펍</option>
          <option value="슈마우스만찬센텀점">슈마우스만찬센텀점</option>
          <option value="큐비e센텀">큐비e센텀</option>
          <option value="STX f&c">STX f&c</option>
          <option value="매머드커피">매머드커피</option>
          <option value="야외쿠킹">야외쿠킹</option>
        </select>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="메시지, 사용자명 검색..."
          className="px-4 py-2 border border-slate-300 rounded-lg flex-1 min-w-[200px]"
        />

        <button
          onClick={fetchMessages}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          새로고침
        </button>
      </div>

      {/* 메시지 테이블 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                  날짜/시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                  채널
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                  메시지
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    메시지가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(msg.created_at).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {msg.channel || "전체"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {msg.display_name || msg.user_name || msg.username || "익명"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="max-w-md truncate">{msg.content || msg.message}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 통계 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500">총 메시지</p>
          <p className="text-2xl font-bold text-blue-600">{filteredMessages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500">고유 사용자</p>
          <p className="text-2xl font-bold text-green-600">
            {new Set(filteredMessages.map((m) => m.display_name || m.user_name || m.username || 'anonymous')).size}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500">기간</p>
          <p className="text-2xl font-bold text-purple-600">
            {daysFilter === 1 ? "오늘" : `${daysFilter}일`}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500">채널</p>
          <p className="text-lg font-bold text-orange-600">{channelFilter}</p>
        </div>
      </div>

      {/* 블랙리스트 관리 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800">블랙리스트 관리</h3>
          <button
            onClick={() => setShowAddBlacklist(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            + 추가
          </button>
        </div>

        {/* 블랙리스트 추가 모달 */}
        {showAddBlacklist && (
          <div className="mb-4 bg-white p-6 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">블랙리스트 추가</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IP 주소
                </label>
                <input
                  type="text"
                  value={newBlacklist.ip_address}
                  onChange={(e) =>
                    setNewBlacklist({ ...newBlacklist, ip_address: e.target.value })
                  }
                  placeholder="예: 192.168.1.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  익명 ID
                </label>
                <input
                  type="text"
                  value={newBlacklist.anonymous_id}
                  onChange={(e) =>
                    setNewBlacklist({ ...newBlacklist, anonymous_id: e.target.value })
                  }
                  placeholder="익명 사용자 ID"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  차단 사유 *
                </label>
                <input
                  type="text"
                  value={newBlacklist.reason}
                  onChange={(e) =>
                    setNewBlacklist({ ...newBlacklist, reason: e.target.value })
                  }
                  placeholder="차단 사유를 입력하세요"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  만료일 (선택)
                </label>
                <input
                  type="datetime-local"
                  value={newBlacklist.expires_at}
                  onChange={(e) =>
                    setNewBlacklist({ ...newBlacklist, expires_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  메모
                </label>
                <textarea
                  value={newBlacklist.notes}
                  onChange={(e) =>
                    setNewBlacklist({ ...newBlacklist, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddBlacklist}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowAddBlacklist(false)}
                  className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 블랙리스트 테이블 */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    IP 주소
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    익명 ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    차단 사유
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    만료일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loadingBlacklist ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : blacklist.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      블랙리스트가 비어있습니다.
                    </td>
                  </tr>
                ) : (
                  blacklist.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {item.ip_address || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {item.anonymous_id || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div className="max-w-xs truncate" title={item.reason}>
                          {item.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {item.expires_at
                          ? new Date(item.expires_at).toLocaleString("ko-KR")
                          : "영구"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.is_active
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.is_active ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleBlacklistStatus(item.id, item.is_active)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              item.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {item.is_active ? "해제" : "활성화"}
                          </button>
                          <button
                            onClick={() => deleteBlacklistItem(item.id)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMonitorTab;
