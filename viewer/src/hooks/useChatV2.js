import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { getAnonymousId } from '../utils/anonymousUser';
import * as chatApi from '../utils/chatApiV2';

/**
 * Get today's date in Korean timezone (UTC+9)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getKoreanToday() {
  const now = new Date();
  // Convert to Korean timezone (UTC+9)
  const koreaOffset = 9 * 60; // minutes
  const localOffset = now.getTimezoneOffset(); // minutes
  const koreanTime = new Date(now.getTime() + (koreaOffset + localOffset) * 60 * 1000);

  const year = koreanTime.getFullYear();
  const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreanTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get anonymous user's message count for today
 * @returns {number} Number of messages sent today
 */
function getAnonymousMessageCount() {
  const today = getKoreanToday();
  const key = `chat_count_${today}`;
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Increment anonymous user's message count
 */
function incrementAnonymousMessageCount() {
  const today = getKoreanToday();
  const key = `chat_count_${today}`;
  const current = getAnonymousMessageCount();
  localStorage.setItem(key, (current + 1).toString());
}

/**
 * Custom hook for chat functionality with channel support
 * @returns {Object} Chat state and functions
 */
export function useChat() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const channelRef = useRef(null);
  const today = getKoreanToday();
  const [chatDate] = useState(today);

  // Determine if input should be enabled (only for today)
  const isInputEnabled = chatDate === today;

  // Get display name based on auth status
  const displayName = isAuthenticated ? user?.nickname || user?.username : getAnonymousId();
  const isAnonymous = !isAuthenticated;
  const anonymousId = isAnonymous ? getAnonymousId() : null;

  // Anonymous user message count and limit
  const anonymousMessageCount = isAnonymous ? getAnonymousMessageCount() : 0;
  const anonymousMessageLimit = 2;
  const anonymousMessagesRemaining = isAnonymous ? Math.max(0, anonymousMessageLimit - anonymousMessageCount) : null;

  // Load messages on mount
  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      setLoading(true);
      setError(null);

      const result = await chatApi.fetchMessages(chatDate);

      if (!isMounted) return;

      if (result.success) {
        setMessages(result.data);
      } else {
        setError(result.error);
      }

      setLoading(false);
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [chatDate]);

  // Subscribe to real-time updates (only for today)
  useEffect(() => {
    if (chatDate !== today) return;

    const handleNewMessage = (newMessage) => {
      setMessages((prev) => {
        // Avoid duplicates (in case of double events)
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    channelRef.current = chatApi.subscribeToMessages(chatDate, handleNewMessage);

    return () => {
      chatApi.unsubscribeFromMessages(channelRef.current);
      channelRef.current = null;
    };
  }, [chatDate, today]);

  // Send message function with channel support
  const sendMessage = useCallback(async (content, channel = 'all') => {
    if (!content.trim() || sending || !isInputEnabled) {
      return { success: false, error: 'Cannot send message' };
    }

    // Check anonymous user limit
    if (isAnonymous && getAnonymousMessageCount() >= anonymousMessageLimit) {
      return {
        success: false,
        error: `익명 사용자는 하루에 ${anonymousMessageLimit}개의 메시지만 보낼 수 있습니다. 로그인하여 무제한 채팅을 이용하세요!`
      };
    }

    setSending(true);

    const result = await chatApi.sendMessage({
      content: content.trim(),
      chatDate,
      userId: isAuthenticated ? user?.id : null,
      displayName,
      isAnonymous,
      anonymousId,
      channel,
    });

    setSending(false);

    // Optimistic update: 즉시 메시지를 state에 추가
    // 실시간 구독도 동작하지만, 즉각적인 UI 업데이트를 위해 추가
    if (result.success && result.data) {
      // Increment anonymous message count
      if (isAnonymous) {
        incrementAnonymousMessageCount();
      }

      setMessages((prev) => {
        // 중복 방지
        if (prev.some((m) => m.id === result.data.id)) {
          return prev;
        }
        return [...prev, result.data];
      });
    }

    return result;
  }, [sending, isInputEnabled, chatDate, isAuthenticated, user, displayName, isAnonymous, anonymousId, anonymousMessageLimit]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    chatDate,
    isInputEnabled,
    displayName,
    isAnonymous,
    today,
    anonymousMessagesRemaining,
  };
}
