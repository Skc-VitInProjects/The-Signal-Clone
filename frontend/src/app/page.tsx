'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useWebSocket } from '../context/WebSocketContext';
import { SidebarHeader } from '../components/sidebar/SidebarHeader';
import { SearchBar } from '../components/sidebar/SearchBar';
import { ConversationList } from '../components/sidebar/ConversationList';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';
import { NewChatModal } from '../components/modals/NewChatModal';
import { NewGroupModal } from '../components/modals/NewGroupModal';
import { GroupInfoModal } from '../components/modals/GroupInfoModal';
import { SettingsModal } from '../components/modals/SettingsModal';
import { MockCallModal } from '../components/modals/MockCallModal';
import { SafetyNumberModal } from '../components/modals/SafetyNumberModal';
import { Shield, MessageSquare, Loader2 } from 'lucide-react';

export default function SignalApp() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    conversations,
    selectedConversation,
    messages,
    loadingMessages,
    replyingTo,
    typingMap,
    selectConversation,
    sendMessage,
    setReplyingTo,
    toggleReaction,
    deleteMessage,
    createDirectChat,
    createGroupChat,
    updateGroupSettings,
    addMember,
    removeMember,
  } = useChat();

  const { sendTyping } = useWebSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [callModal, setCallModal] = useState<{ isOpen: boolean; type: 'audio' | 'video' }>({
    isOpen: false,
    type: 'audio',
  });
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [mobileChatView, setMobileChatView] = useState(false);

  // Authentication gate
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Handle mobile selection
  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setMobileChatView(true);
  };

  const handleMobileBack = () => {
    setMobileChatView(false);
    selectConversation(null);
  };

  if (authLoading || !user) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
          gap: 16,
        }}
      >
        <Shield size={44} color="var(--signal-blue)" />
        <Loader2 size={24} className="animate-spin" color="var(--signal-blue)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading Signal...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className={`sidebar ${mobileChatView && selectedConversation ? 'mobile-hidden' : ''}`}>
        <SidebarHeader
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenNewGroup={() => setIsNewGroupOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SearchBar query={searchQuery} onChange={setSearchQuery} />
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id || null}
          currentUser={user}
          typingMap={typingMap}
          searchQuery={searchQuery}
          onSelect={handleSelectConversation}
          onOpenNewChat={() => setIsNewChatOpen(true)}
        />
      </aside>

      {/* Right Chat Pane */}
      <main className="chat-pane">
        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              currentUser={user}
              onBackMobile={handleMobileBack}
              onOpenInfo={() => setIsGroupInfoOpen(true)}
              onOpenCall={(type) => setCallModal({ isOpen: true, type })}
              onOpenSafetyNumbers={() => setIsSafetyModalOpen(true)}
            />

            {loadingMessages ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--text-muted)',
                }}
              >
                <Loader2 size={24} className="animate-spin" color="var(--signal-blue)" />
                <span>Decrypting messages...</span>
              </div>
            ) : (
              <MessageList
                conversation={selectedConversation}
                messages={messages}
                currentUser={user}
                typingUsers={typingMap[selectedConversation.id]}
                onReply={(msg) => setReplyingTo(msg)}
                onToggleReaction={toggleReaction}
                onDelete={deleteMessage}
                onOpenSafetyNumbers={() => setIsSafetyModalOpen(true)}
              />
            )}

            <MessageComposer
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onSend={sendMessage}
              onTyping={(isTyping) => sendTyping(selectedConversation.id, isTyping)}
            />
          </>
        ) : (
          /* Empty Chat Splash View (Signal Desktop Style) */
          <div className="chat-empty-state">
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--signal-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Shield size={48} color="var(--signal-blue)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              Signal for Web & Desktop
            </h2>
            <p style={{ maxWidth: 380, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Select a chat from the sidebar or start a new encrypted direct or group conversation.
              All messages are private, authenticated, and real-time.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="btn-primary" onClick={() => setIsNewChatOpen(true)}>
                <MessageSquare size={16} style={{ marginRight: 6 }} /> New Chat
              </button>
              <button className="btn-secondary" onClick={() => setIsNewGroupOpen(true)}>
                New Group
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectUser={async (targetUser) => {
          setIsNewChatOpen(false);
          const conv = await createDirectChat(targetUser.id);
          selectConversation(conv.id);
          setMobileChatView(true);
        }}
      />

      <NewGroupModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
        onCreateGroup={async (name, memberIds, desc) => {
          const conv = await createGroupChat(name, memberIds, undefined, desc);
          selectConversation(conv.id);
          setMobileChatView(true);
        }}
      />

      {selectedConversation && (
        <>
          <GroupInfoModal
            isOpen={isGroupInfoOpen}
            onClose={() => setIsGroupInfoOpen(false)}
            conversation={selectedConversation}
            currentUser={user}
            onUpdateSettings={updateGroupSettings}
            onAddMember={addMember}
            onRemoveMember={removeMember}
          />

          <MockCallModal
            isOpen={callModal.isOpen}
            callType={callModal.type}
            conversation={selectedConversation}
            onClose={() => setCallModal({ isOpen: false, type: 'audio' })}
          />

          <SafetyNumberModal
            isOpen={isSafetyModalOpen}
            conversation={selectedConversation}
            onClose={() => setIsSafetyModalOpen(false)}
          />
        </>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
