import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { getAnonymousId } from '../utils/anonymousUser';
import * as chatApi from '../utils/chatApi';

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
 * Custom hook for chat functionality
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

  // Send message function
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || sending || !isInputEnabled) {
      return { success: false, error: 'Cannot send message' };
    }

    setSending(true);

    const result = await chatApi.sendMessage({
      content: content.trim(),
      chatDate,
      userId: isAuthenticated ? user?.id : null,
      displayName,
      isAnonymous,
      anonymousId,
    });

    setSending(false);

    // Note: We don't need to add the message to state here
    // The real-time subscription will handle it

    return result;
  }, [sending, isInputEnabled, chatDate, isAuthenticated, user, displayName, isAnonymous, anonymousId]);

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
  };
}
