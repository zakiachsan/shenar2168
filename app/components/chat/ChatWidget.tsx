'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@/lib/chat-context';
import { useAuth } from '@/app/components/layout/AuthProvider';
import LoginModal from '@/app/components/layout/LoginModal';
import { X, Send, MessageCircle, Loader2, User, ChevronLeft } from 'lucide-react';

interface ChatMessage {
  id: number;
  threadId: number;
  senderType: 'user' | 'admin';
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatThread {
  id: number;
  userId: number | null;
  userName: string;
  userPhone: string | null;
  productId: number | null;
  productName: string | null;
  status: 'open' | 'closed';
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export default function ChatWidget() {
  const { isOpen, productId, productName, closeChat } = useChat();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isNearBottomRef = useRef(true);

  // Check auth when chat opens
  useEffect(() => {
    if (isOpen && !user) {
      closeChat();
      setShowLoginModal(true);
    }
  }, [isOpen, user, closeChat]);

  // Auto-focus textarea when chat opens on mobile
  useEffect(() => {
    if (isOpen && user) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
  }, [isOpen, user]);

  // Load or create thread when chat opens
  useEffect(() => {
    if (!isOpen || !user) return;
    
    setLoading(true);
    fetch(`/api/chat?userId=${user.phone}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.threads) {
          const existing = data.threads.find((t: ChatThread) => {
            if (productId) return t.productId === Number(productId);
            return !t.productId;
          });
          if (existing) {
            setThread(existing);
            return fetchMessages(existing.id);
          }
        }
        setThread(null);
        setMessages([]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, user, productId]);

  // Check if user is near bottom of messages
  const handleScroll = useCallback(() => {
    const el = messagesEndRef.current?.parentElement;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isNearBottomRef.current = isAtBottom;
  }, []);

  // Scroll to bottom only if user is already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Poll for new messages — uses ref for lastMessageId to avoid re-renders
  useEffect(() => {
    if (!thread) return;
    
    const poll = () => {
      fetch(`/api/chat/poll?threadId=${thread.id}&lastMessageId=${lastMessageIdRef.current}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.hasNew && data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length > 0) {
                // Update ref directly — no re-render from this
                lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...newMsgs.map((m: ChatMessage) => m.id));
                return [...prev, ...newMsgs];
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [thread?.id]); // Only re-run when thread ID changes, not on lastMessageId

  const fetchMessages = async (threadId: number) => {
    try {
      const res = await fetch(`/api/chat?userId=${user?.phone}&threadId=${threadId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        if (data.messages.length > 0) {
          lastMessageIdRef.current = Math.max(...data.messages.map((m: ChatMessage) => m.id));
        }
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.phone,
          userName: user.name || user.phone,
          userPhone: user.phone,
          productId: productId || undefined,
          productName: productName || undefined,
          message: message.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.thread && !thread) {
          setThread(data.thread);
        }
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          lastMessageIdRef.current = data.message.id;
        }
        setMessage('');
        // Re-focus textarea after send
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCloseLoginModal = () => setShowLoginModal(false);

  if (!isOpen && !showLoginModal) return null;
  if (showLoginModal) {
    return <LoginModal open={showLoginModal} onClose={handleCloseLoginModal} />;
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const isGeneralChat = !productId;

  // Chat Widget Component (shared between desktop and mobile)
  const ChatContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-shopee-orange text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Chat Penjual</p>
            <p className="text-[11px] text-white/80 line-clamp-1 max-w-[200px]">
              {thread ? (thread.productName || 'Chat Umum') : (productName || 'Ada yang bisa kami bantu?')}
            </p>
          </div>
        </div>
        <button onClick={closeChat} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-shopee-orange/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-shopee-orange" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-2">Mulai Chat</p>
            <p className="text-sm text-gray-500 mb-4">
              Kirim pesan ke penjual. Kami siap membantu Anda!
            </p>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 w-full max-w-[280px]">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-shopee-orange flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg rounded-tl-none p-3">
                  <p className="text-sm text-gray-700">Halo! Ada yang bisa kami bantu?</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.senderType === 'admin' && (
                  <div className="w-7 h-7 rounded-full bg-shopee-orange flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`rounded-lg p-3 max-w-[80%] ${
                  msg.senderType === 'user'
                    ? 'bg-shopee-orange text-white rounded-br-none'
                    : 'bg-white text-gray-700 rounded-bl-none shadow-sm border border-gray-100'
                }`}>
                  {msg.senderType === 'admin' && (
                    <p className="text-[10px] mb-0.5 text-gray-400">
                      {msg.senderName || 'Admin'}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[10px] mt-1 text-right ${
                    msg.senderType === 'user' ? 'text-white/60' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
                {msg.senderType === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                )}
              </div>
            ))}
            {/* Waiting indicator when last message is from user */}
            
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            rows={1}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-shopee-orange max-h-20"
            style={{ minHeight: '38px' }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="p-2 bg-shopee-orange text-white rounded-lg hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  // On mobile, redirect to /chat page (better keyboard support)
  // Only show floating widget on desktop
  return (
    <div className="hidden lg:block fixed bottom-6 right-6 z-[100]">
      <div className="w-[380px] h-[520px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        <ChatContent />
      </div>
    </div>
  );
}
