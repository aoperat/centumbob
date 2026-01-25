import { useState, useRef, useEffect } from 'react';

// Chat icon SVG component
function IconChat({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

// Close icon SVG component
function IconClose({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Send icon SVG component
function IconSend({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

// Format time to HH:MM
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Chat message component
function ChatMessage({ message, isOwn, currentChannel }) {
  const showChannelBadge = currentChannel === 'all' && message.channel && message.channel !== 'all';

  return (
    <div className={`flex flex-col mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <span className={`text-xs font-medium ${message.is_anonymous ? 'text-slate-500' : 'text-blue-600'}`}>
          {message.display_name}
        </span>
        {showChannelBadge && (
          <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
            {message.channel}
          </span>
        )}
        <span className="text-xs text-slate-400">
          {formatTime(message.created_at)}
        </span>
      </div>
      <div
        className={`
          max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words
          ${isOwn
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-slate-100 text-slate-800 rounded-bl-md'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function ChatWindowV2({
  restaurants = [],
  isOpen,
  onClose,
  messages,
  loading,
  error,
  sending,
  sendMessage,
  chatDate,
  isInputEnabled,
  displayName,
  isAnonymous,
  anonymousMessagesRemaining,
}) {
  const [activeChannel, setActiveChannel] = useState('all');
  const [targetChannel, setTargetChannel] = useState('all'); // 메시지 보낼 채널 (기본: 전체)
  const [showAllChannels, setShowAllChannels] = useState(true); // 전체 채널에서 다른 채널 메시지 표시 여부
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 채널 목록: 전체 + 식당들
  const channels = ['all', ...restaurants];
  const channelLabels = {
    all: '전체',
    ...Object.fromEntries(restaurants.map(r => [r, r]))
  };

  // 현재 채널에 맞는 메시지 필터링
  const filteredMessages = activeChannel === 'all'
    ? showAllChannels
      ? messages // 전체 채널 + 모든 메시지 표시
      : messages.filter(m => m.channel === 'all') // 전체 채널 + 전체 메시지만 표시
    : messages.filter(m => m.channel === activeChannel); // 식당 채널: 해당 식당 메시지만

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && isInputEnabled) {
      inputRef.current.focus();
    }
  }, [isOpen, isInputEnabled]);

  // 채널 변경 시 targetChannel 설정
  // - 전체 채널: 기본값 'all' 유지
  // - 식당 채널: 해당 식당으로 고정
  useEffect(() => {
    if (activeChannel === 'all') {
      setTargetChannel('all'); // 전체 채널로 돌아오면 기본값 'all'
    } else {
      setTargetChannel(activeChannel); // 식당 채널에서는 해당 식당으로 고정
    }
  }, [activeChannel]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() || sending || !isInputEnabled) return;

    const result = await sendMessage(inputValue, targetChannel);

    if (result.success) {
      setInputValue('');
    } else if (result.error) {
      // 에러 메시지 표시 (alert 대신 더 나은 UX를 위해 사용)
      alert(result.error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Check if a message is from the current user
  const isOwnMessage = (message) => {
    if (isAnonymous) {
      return message.anonymous_id === displayName;
    }
    return message.display_name === displayName;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 md:bottom-6 md:right-6 md:left-auto z-50 w-auto md:w-[480px] h-[85vh] md:h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center shrink-0">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <IconChat className="w-5 h-5" />
            오늘의 채팅
          </h3>
          <p className="text-xs text-blue-100 mt-0.5">{chatDate}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="채팅 닫기"
        >
          <IconClose className="w-5 h-5" />
        </button>
      </div>

      {/* User info bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-slate-600">
            <span className={isAnonymous ? 'text-slate-500' : 'text-blue-600 font-medium'}>
              {isAnonymous ? '익명 참여 중' : '로그인 참여 중'}
            </span>
            <span className="mx-2">·</span>
            <span className="font-medium">{displayName}</span>
          </div>
          {isAnonymous && anonymousMessagesRemaining !== null && (
            <div className={`text-xs font-medium ${anonymousMessagesRemaining === 0 ? 'text-red-600' : 'text-orange-600'}`}>
              오늘 {anonymousMessagesRemaining}개 남음
            </div>
          )}
        </div>
      </div>

      {/* Channel tabs */}
      <div className="bg-white border-b border-slate-200 px-2 py-2 shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {channels.map((channel) => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap
                ${activeChannel === channel
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {channelLabels[channel]}
            </button>
          ))}
        </div>
      </div>

      {/* 전체 채널에서 다른 채널 메시지 표시 토글 */}
      {activeChannel === 'all' && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllChannels}
              onChange={(e) => setShowAllChannels(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-slate-600">
              다른 채널 메시지도 보기
            </span>
          </label>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500 text-sm">
            {error}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <IconChat className="w-12 h-12 mb-2 opacity-50" />
            <p>아직 채팅이 없습니다.</p>
            <p className="text-xs mt-1">첫 메시지를 남겨보세요!</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={isOwnMessage(message)}
                currentChannel={activeChannel}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 p-3 bg-white shrink-0">
        {isInputEnabled ? (
          <>
            {/* 익명 사용자 메시지 제한 안내 */}
            {isAnonymous && anonymousMessagesRemaining === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-red-700 mb-1">
                  오늘 메시지 전송 횟수를 모두 사용했습니다.
                </p>
                <p className="text-xs text-red-600">
                  로그인하면 무제한으로 채팅을 이용할 수 있습니다!
                </p>
              </div>
            ) : (
              <>
                {/* 익명 사용자 경고 */}
                {isAnonymous && anonymousMessagesRemaining === 1 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2 text-xs text-orange-700">
                    ⚠️ 익명 사용자는 오늘 <strong>1개</strong>의 메시지만 더 보낼 수 있습니다. 로그인하면 무제한 채팅!
                  </div>
                )}

                {/* 전체 채널에서만 타겟 채널 선택 표시 */}
                {activeChannel === 'all' && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">메시지 보낼 채널:</span>
                    <select
                      value={targetChannel}
                      onChange={(e) => setTargetChannel(e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-300 rounded bg-white outline-none focus:border-blue-500"
                    >
                      <option value="all">전체</option>
                      {restaurants.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`메시지를 입력하세요...`}
                    maxLength={500}
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || sending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="전송"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <IconSend className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="text-center text-sm text-slate-500 py-2">
            오늘 날짜에만 채팅을 입력할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
