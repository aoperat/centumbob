import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

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
function ChatMessage({ message, isOwn }) {
  return (
    <div className={`flex flex-col mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <span className={`text-xs font-medium ${message.is_anonymous ? 'text-slate-500' : 'text-blue-600'}`}>
          {message.display_name}
        </span>
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

export default function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    chatDate,
    isInputEnabled,
    displayName,
    isAnonymous,
  } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && isInputEnabled) {
      inputRef.current.focus();
    }
  }, [isOpen, isInputEnabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() || sending || !isInputEnabled) return;

    const result = await sendMessage(inputValue);

    if (result.success) {
      setInputValue('');
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

  return (
    <>
      {/* Floating button (collapsed state) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
          aria-label="채팅 열기"
        >
          <IconChat className="w-6 h-6" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {messages.length > 99 ? '99+' : messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat window (expanded state) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
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
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="채팅 닫기"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>

          {/* User info bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 shrink-0">
            <span className={isAnonymous ? 'text-slate-500' : 'text-blue-600 font-medium'}>
              {isAnonymous ? '익명 참여 중' : '로그인 참여 중'}
            </span>
            <span className="mx-2">·</span>
            <span className="font-medium">{displayName}</span>
          </div>

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
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <IconChat className="w-12 h-12 mb-2 opacity-50" />
                <p>아직 채팅이 없습니다.</p>
                <p className="text-xs mt-1">첫 메시지를 남겨보세요!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isOwn={isOwnMessage(message)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200 p-3 bg-white shrink-0">
            {isInputEnabled ? (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요..."
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
            ) : (
              <div className="text-center text-sm text-slate-500 py-2">
                오늘 날짜에만 채팅을 입력할 수 있습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
