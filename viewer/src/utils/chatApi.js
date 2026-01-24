// Supabase chat API utilities
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

    return { success: true, data: data || [] };
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
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function sendMessage({ content, chatDate, userId, displayName, isAnonymous, anonymousId }) {
  try {
    const { data, error } = await supabase
      .from('centumbob_chat_messages')
      .insert([{
        content,
        chat_date: chatDate,
        user_id: userId,
        display_name: displayName,
        is_anonymous: isAnonymous,
        anonymous_id: anonymousId,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
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
        callback(payload.new);
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
