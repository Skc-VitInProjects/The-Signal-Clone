import { User, Conversation, Message, Contact, AuthResponse } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('signal_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.warn(`[Signal API] Network connection error requesting ${endpoint}:`, err);
    throw new Error(`Cannot connect to Signal backend at ${API_BASE}. Please ensure backend server is running.`);
  }

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const err = await response.json();
      errorMsg = err.detail || err.message || errorMsg;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(identifier: string, otp?: string, password?: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, password }),
    });
  },

  async register(username: string, display_name: string, phone?: string, avatar_url?: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, display_name, phone, avatar_url }),
    });
  },

  async getMe(): Promise<User> {
    return apiRequest<User>('/api/auth/me');
  },

  async getDemoUsers(): Promise<User[]> {
    return apiRequest<User[]>('/api/auth/demo-users');
  },

  // Users & Contacts
  async searchUsers(query: string = ''): Promise<User[]> {
    return apiRequest<User[]>(`/api/users/search?q=${encodeURIComponent(query)}`);
  },

  async updateProfile(data: { display_name?: string; about?: string; avatar_url?: string }): Promise<User> {
    return apiRequest<User>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('signal_token');
    const response = await fetch(`${API_BASE}/api/users/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('Avatar upload failed');
    return response.json();
  },

  async getContacts(): Promise<Contact[]> {
    return apiRequest<Contact[]>('/api/users/contacts');
  },

  async addContact(contact_username_or_phone: string, nickname?: string): Promise<Contact> {
    return apiRequest<Contact>('/api/users/contacts', {
      method: 'POST',
      body: JSON.stringify({ contact_username_or_phone, nickname }),
    });
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return apiRequest<Conversation[]>('/api/conversations');
  },

  async getConversation(id: string): Promise<Conversation> {
    return apiRequest<Conversation>(`/api/conversations/${id}`);
  },

  async createDirectConversation(recipient_id: string): Promise<Conversation> {
    return apiRequest<Conversation>('/api/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ recipient_id }),
    });
  },

  async createGroupConversation(name: string, member_ids: string[], avatar_url?: string, description?: string): Promise<Conversation> {
    return apiRequest<Conversation>('/api/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ name, member_ids, avatar_url, description }),
    });
  },

  async updateConversation(
    id: string,
    data: { name?: string; description?: string; avatar_url?: string; disappearing_timer?: number }
  ): Promise<Conversation> {
    return apiRequest<Conversation>(`/api/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addGroupMember(conversation_id: string, user_id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/conversations/${conversation_id}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
  },

  async removeGroupMember(conversation_id: string, user_id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/api/conversations/${conversation_id}/members/${user_id}`, {
      method: 'DELETE',
    });
  },

  async markAsRead(conversation_id: string): Promise<{ status: string }> {
    return apiRequest<{ status: string }>(`/api/conversations/${conversation_id}/read`, {
      method: 'POST',
    });
  },

  // Messages
  async getMessages(conversation_id: string): Promise<Message[]> {
    return apiRequest<Message[]>(`/api/messages/${conversation_id}`);
  },

  async sendMessage(data: {
    conversation_id: string;
    content: string;
    message_type?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    reply_to_id?: string;
  }): Promise<Message> {
    return apiRequest<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleReaction(message_id: string, emoji: string): Promise<{ status: string; reactions: any[] }> {
    return apiRequest<{ status: string; reactions: any[] }>(`/api/messages/${message_id}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  async deleteMessage(message_id: string): Promise<{ status: string }> {
    return apiRequest<{ status: string }>(`/api/messages/${message_id}`, {
      method: 'DELETE',
    });
  },

  async uploadAttachment(file: File): Promise<{
    file_url: string;
    file_name: string;
    file_size: number;
    message_type: 'image' | 'file';
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('signal_token');
    const response = await fetch(`${API_BASE}/api/messages/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) throw new Error('File upload failed');
    return response.json();
  },

  getMediaUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url}`;
  },

  getWsUrl(): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : '';
    const wsBase = API_BASE.replace(/^http/, 'ws');
    return `${wsBase}/ws?token=${token}`;
  }
};
