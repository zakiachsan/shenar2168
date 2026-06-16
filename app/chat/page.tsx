'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/components/layout/AuthProvider';
import {
  ArrowLeft, Send, MessageCircle, Loader2, User, Package,
  Star, Clock, Truck, ShoppingCart, ChevronDown, ChevronUp
} from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: number;
  threadId: number;
  senderType: 'user' | 'admin';
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  productId?: number | null;
  productName?: string | null;
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

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [productSent, setProductSent] = useState(false);
  const [showProductCard, setShowProductCard] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const isNearBottomRef = useRef(true);

  // Product info from URL params
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName');
  const productImage = searchParams.get('productImage');
  const productPrice = searchParams.get('productPrice');

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Load thread — check if there's an existing thread with this productId
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    fetch(`/api/chat?userId=${user.phone}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.threads && data.threads.length > 0) {
          // Prefer thread with matching productId
          const matchingThread = productId
            ? data.threads.find((t: ChatThread) => String(t.productId) === productId) || data.threads[0]
            : data.threads.find((t: ChatThread) => !t.productId) || data.threads[0];
          setThread(matchingThread);
          // Only hide product card if the thread has the SAME product
          if (matchingThread.productId && String(matchingThread.productId) === productId) {
            setProductSent(true);
            setShowProductCard(false);
          }
          return fetchMessages(matchingThread.id);
        }
        setThread(null);
        setMessages([]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, productId]);

  // Auto-focus textarea
  useEffect(() => {
    if (!loading) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [loading]);

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

  // Check if near bottom
  const handleScroll = useCallback(() => {
    const el = messagesEndRef.current?.parentElement;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isNearBottomRef.current = isAtBottom;
  }, []);

  // Smart scroll
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Poll for new messages
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
  }, [thread?.id]);

  const handleSend = async () => {
    if (!user) return;

    // Send the product card as first message if product info exists and not yet sent
    const shouldSendProduct = productId && !productSent;

    // If no text and no product to send, do nothing
    if (!message.trim() && !shouldSendProduct) return;

    setSending(true);
    try {
      // Step 1: Send product card first (if needed)
      if (shouldSendProduct) {
        const productText = productName
          ? `Saya ingin bertanya tentang produk:\n${decodeURIComponent(productName)}`
          : 'Saya ingin bertanya tentang produk ini';

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.phone,
            userName: user.name || user.phone,
            userPhone: user.phone,
            message: productText,
            productId: Number(productId),
            productName: productName || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.thread && !thread) setThread(data.thread);
          if (data.message) {
            setMessages((prev) => [...prev, data.message]);
            lastMessageIdRef.current = data.message.id;
          }
        }
        setProductSent(true);
        setShowProductCard(false);
      }

      // Step 2: Send user's text message (if any)
      if (message.trim()) {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.phone,
            userName: user.name || user.phone,
            userPhone: user.phone,
            message: message.trim(),
            productId: productId ? Number(productId) : undefined,
            productName: productName || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.thread && !thread) setThread(data.thread);
          if (data.message) {
            setMessages((prev) => [...prev, data.message]);
            lastMessageIdRef.current = data.message.id;
          }
        }
        setMessage('');
      }

      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  // Render product card as a chat message bubble
  const renderProductCard = () => {
    if (!productId || !showProductCard || productSent) return null;
    return (
      <div className="flex items-end gap-2 justify-end">
        <div className="max-w-[85%]">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Product Image */}
            <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
              {productImage ? (
                <img
                  src={decodeURIComponent(productImage)}
                  alt={productName || 'Produk'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-16 h-16 text-gray-300" />
              )}
            </div>
            {/* Product Info */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                {productName ? decodeURIComponent(productName) : 'Produk'}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {productPrice && (
                  <p className="text-sm font-semibold text-shopee-orange">
                    {formatCurrency(productPrice)}
                  </p>
                )}
                <span className="text-[10px] text-white bg-red-500 px-1.5 py-0.5 rounded-sm font-medium">COD</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  1-2 Hari
                </span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  5.0
                </span>
              </div>
            </div>
            {/* Buy Button */}
            <Link
              href={productId ? `/product/${productId}` : '#'}
              className="block mx-3 mb-3 px-4 py-2 bg-shopee-orange text-white text-center text-sm font-medium rounded-lg hover:bg-[#EA580C] transition-colors"
            >
              <ShoppingCart className="w-4 h-4 inline mr-1.5" />
              Lihat Produk
            </Link>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            {formatTime(new Date().toISOString())}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-gray-500" />
        </div>
      </div>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-shopee-orange text-white px-4 py-3 flex items-center gap-3 flex-shrink-0 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Chat Penjual</p>
          <p className="text-[11px] text-white/80">
            {thread ? (thread.productName || 'Chat Umum') : 'Ada yang bisa kami bantu?'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        onScroll={handleScroll}
        style={{ minHeight: 'calc(100vh - 120px)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
          </div>
        ) : messages.length === 0 && !showProductCard ? (
          <div className="flex flex-col items-center justify-center text-center px-4 py-12">
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
            {/* Product Card as a message */}
            {renderProductCard()}

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
            {messages.length > 0 && messages[messages.length - 1].senderType === 'user' && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-shopee-orange flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-gray-400">Menunggu jawaban...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — sticky bottom */}
      <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0 sticky bottom-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={productId && !productSent ? "Ketik pertanyaan tentang produk..." : "Ketik pesan..."}
            rows={1}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-shopee-orange max-h-20"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={(!!message.trim() ? false : !!productId && !productSent ? false : true) || sending}
            className="p-2.5 bg-shopee-orange text-white rounded-lg hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
