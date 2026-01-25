// Supabase chat API utilities with channel support
import { supabase } from './supabaseClient';

/**
 * Fetch chat messages for a specific date
 * @param {string} chatDate - Date string in YYYY-MM-DD format
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function fetchMessages(chatDate) {
  try {
    const { data, error } = await supabase
      .from('centumbob_chat_messages')
      .select('*')
      .eq('chat_date', chatDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }

    // channel 컬럼이 없는 기존 메시지는 'all'로 처리
    const messagesWithChannel = (data || []).map(msg => ({
      ...msg,
      channel: msg.channel || 'all'
    }));

    return { success: true, data: messagesWithChannel };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

/**
 * Send a chat message
 * @param {Object} params - Message parameters
 * @param {string} params.content - Message content
 * @param {string} params.chatDate - Date string in YYYY-MM-DD format
 * @param {string|null} params.userId - User ID (null for anonymous)
 * @param {string} params.displayName - Display name (nickname or anonymous ID)
 * @param {boolean} params.isAnonymous - Whether the user is anonymous
 * @param {string|null} params.anonymousId - Anonymous ID (null for logged-in users)
 * @param {string} params.channel - Channel name (default: 'all')
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function sendMessage({
  content,
  chatDate,
  userId,
  displayName,
  isAnonymous,
  anonymousId,
  channel = 'all'
}) {
  try {
    const messageData = {
      content,
      chat_date: chatDate,
      user_id: userId,
      display_name: displayName,
      is_anonymous: isAnonymous,
      anonymous_id: anonymousId,
    };

    // channel 컬럼이 존재하면 추가 (하위 호환성)
    // 실제로는 마이그레이션 후에는 항상 추가됨
    try {
      messageData.channel = channel;
    } catch (e) {
      console.warn('Channel column might not exist yet, sending without it');
    }

    const { data, error } = await supabase
      .from('centumbob_chat_messages')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }

    // 응답에 channel 추가 (없으면 'all')
    const messageWithChannel = {
      ...data,
      channel: data.channel || channel || 'all'
    };

    return { success: true, data: messageWithChannel };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'Failed to send message' };
  }
}

/**
 * Subscribe to real-time chat messages for a specific date
 * @param {string} chatDate - Date string in YYYY-MM-DD format
 * @param {Function} callback - Callback function called when new message arrives
 * @returns {Object} Supabase channel object (use for unsubscribe)
 */
export function subscribeToMessages(chatDate, callback) {
  const channel = supabase
    .channel(`chat_${chatDate}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'centumbob_chat_messages',
        filter: `chat_date=eq.${chatDate}`,
      },
      (payload) => {
        // channel 컬럼이 없으면 'all'로 처리
        const messageWithChannel = {
          ...payload.new,
          channel: payload.new.channel || 'all'
        };
        callback(messageWithChannel);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from chat messages
 * @param {Object} channel - Supabase channel object
 */
export function unsubscribeFromMessages(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
