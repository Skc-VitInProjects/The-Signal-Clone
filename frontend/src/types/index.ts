export interface User {
  id: string;
  username: string;
  display_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  about?: string;
  is_online?: boolean;
  last_seen?: string | null;
  created_at?: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_name?: string;
  emoji: string;
  created_at: string;
}

export interface MessageReplyPreview {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  reply_to_id?: string | null;
  reply_to?: MessageReplyPreview | null;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  expires_at?: string | null;
  is_deleted?: boolean;
  reactions?: MessageReaction[];
  created_at: string;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  user: User;
  joined_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  created_by_id?: string | null;
  disappearing_timer: number; // seconds (0 = off)
  participants: Participant[];
  last_message?: Message | null;
  unread_count: number;
  updated_at: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_user: User;
  nickname?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface TypingIndicatorEvent {
  conversation_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
}
