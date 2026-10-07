'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import { api } from '../../lib/api';
import {
  Paperclip,
  Smile,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
} from 'lucide-react';
import { showToast } from '../ui/Toast';

interface MessageComposerProps {
  replyingTo: Message | null;
  onCancelReply: () => void;
  onSend: (content: string, attachment?: { url: string; name: string; size: number; type: string }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

const COMMON_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🙏', '🎉', '🔒', '🚀', '❤️', '👀', '💯'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  replyingTo,
  onCancelReply,
  onSend,
  onTyping,
}) => {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus textarea when replyingTo changes
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Notify typing
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onTyping(false);

    const sendingAttachment = attachment || undefined;
    const content = trimmed || (attachment?.type === 'image' ? 'Photo' : 'Attachment');

    setText('');
    setAttachment(null);
    setShowEmojiPicker(false);

    try {
      await onSend(content, sendingAttachment);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'warning');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.uploadAttachment(file);
      setAttachment({
        url: res.file_url,
        name: res.file_name,
        size: res.file_size,
        type: res.message_type,
      });
      showToast('Attachment uploaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Attachment upload failed', 'warning');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="chat-composer">
      {/* Quoted Message Preview */}
      {replyingTo && (
        <div className="quote-reply-box">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--signal-blue)', fontWeight: 600 }}>
              Replying to {replyingTo.sender?.display_name || 'User'}
            </div>
            <div
              style={{
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {replyingTo.content}
            </div>
          </div>
          <button onClick={onCancelReply} style={{ opacity: 0.7 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Uploaded Attachment Preview */}
      {attachment && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--bg-input)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          {attachment.type === 'image' ? (
            <ImageIcon size={20} color="var(--signal-blue)" />
          ) : (
            <FileText size={20} color="var(--signal-blue)" />
          )}
          <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachment.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {(attachment.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button onClick={() => setAttachment(null)} style={{ opacity: 0.7 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            left: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 30,
          }}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((prev) => prev + emoji);
                setShowEmojiPicker(false);
                textareaRef.current?.focus();
              }}
              style={{ fontSize: 20, padding: 4, borderRadius: 4 }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input Bar */}
      <div className="composer-input-row">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        <button
          className="icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Add Attachment"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          className="composer-textarea"
          placeholder="Signal message (Enter to send, Shift+Enter for new line)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
        />

        <div className="composer-actions">
          <button
            className="icon-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emoji"
          >
            <Smile size={18} />
          </button>

          <button
            onClick={handleSend}
            disabled={!text.trim() && !attachment}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: text.trim() || attachment ? 'var(--signal-blue)' : 'transparent',
              color: text.trim() || attachment ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
              cursor: text.trim() || attachment ? 'pointer' : 'default',
            }}
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
