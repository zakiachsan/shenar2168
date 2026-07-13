'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  MessageCircle,
  Send,
  Search,
  CheckCircle2,
  Clock,
  X,
  User,
  ArrowLeft,
  Trash2,
  CircleDot,
  Settings,
  Save,
} from 'lucide-react';

interface ChatThread {
  id: number;
  userId: number | null;
  userName: string;
  userPhone: string | null;
  productId: number | null;
  productName: string | null;
  status: 'open' | 'closed';
  adminRead: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  threadId: number;
  senderType: 'user' | 'admin';
  senderName: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const SUB_FILTERS = [
  { value: 'all', label: 'Semua', icon: MessageCircle },
  { value: 'open', label: 'Aktif', icon: CircleDot },
  { value: 'unread', label: 'Belum Dibaca', icon: Clock },
  { value: 'closed', label: 'Selesai', icon: CheckCircle2 },
];

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m lalu`;
  if (diffHours < 24) return `${diffHours}j lalu`;
  if (diffDays < 7) return `${diffDays}h lalu`;
  return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
}

function formatFullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

export default function AdminChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'chat' | 'settings'>('chat');
  const [subFilter, setSubFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastMessageId, setLastMessageId] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Settings state
  const [greetingMessage, setGreetingMessage] = useState('');
  const [offlineMessage, setOfflineMessage] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (mainTab === 'chat') {
      loadThreads();
    } else {
      loadSettings();
    }
  }, [mainTab, subFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mainTab === 'chat') loadThreads();
    }, 10000);
    return () => clearInterval(interval);
  }, [mainTab]);

  const loadThreads = async () => {
    try {
      const params = new URLSearchParams();
      if (subFilter === 'open' || subFilter === 'closed') params.set('status', subFilter);
      if (subFilter === 'unread') params.set('unreadOnly', '1');

      const res = await fetch(`/api/admin/chat?${params}`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch {}
    setLoading(false);
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/chat/settings');
      if (res.ok) {
        const data = await res.json();
        setGreetingMessage(data.settings?.greeting_message || '');
        setOfflineMessage(data.settings?.offline_message || '');
      }
    } catch {}
    setLoadingSettings(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/chat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ greeting_message: greetingMessage, offline_message: offlineMessage }),
      });
      if (res.ok) {
        alert('Pengaturan berhasil disimpan!');
      }
    } catch {}
    setSavingSettings(false);
  };

  const loadMessages = async (threadId: number) => {
    try {
      const res = await fetch(`/api/admin/chat?threadId=${threadId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.messages && data.messages.length > 0) {
          setLastMessageId(Math.max(...data.messages.map((m: ChatMessage) => m.id)));
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!selectedThread) return;

    setLoadingMessages(true);
    loadMessages(selectedThread.id).finally(() => setLoadingMessages(false));

    const poll = () => {
      fetch(`/api/chat/poll?threadId=${selectedThread.id}&lastMessageId=${lastMessageId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.hasNew && data.messages) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
              if (newMsgs.length > 0) {
                setLastMessageId(Math.max(...data.messages.map((m: ChatMessage) => m.id)));
                return [...prev, ...newMsgs];
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    };

    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedThread?.id, lastMessageId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectThread = (thread: ChatThread) => {
    setSelectedThread(thread);
    setMessages([]);
    setLastMessageId(0);
    setThreads((prev) =>
      prev.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0, adminRead: true } : t))
    );
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedThread.id,
          message: replyText.trim(),
          adminName: 'Admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          setLastMessageId(data.message.id);
          setReplyText('');
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedThread.id
                ? { ...t, lastMessage: replyText.trim(), lastMessageAt: new Date().toISOString(), adminRead: true }
                : t
            )
          );
        }
      }
    } catch {}
    setSending(false);
  };

  const handleToggleStatus = async (thread: ChatThread) => {
    const newStatus = thread.status === 'open' ? 'closed' : 'open';
    try {
      await fetch('/api/admin/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, status: newStatus }),
      });
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, status: newStatus as 'open' | 'closed' } : t))
      );
      if (selectedThread?.id === thread.id) {
        setSelectedThread((prev) => (prev ? { ...prev, status: newStatus as 'open' | 'closed' } : null));
      }
    } catch {}
  };

  const handleDeleteThread = async (thread: ChatThread) => {
    if (!confirm(`Hapus chat dengan ${thread.userName}?`)) return;
    try {
      await fetch(`/api/admin/chat?threadId=${thread.id}`, { method: 'DELETE' });
      setThreads((prev) => prev.filter((t) => t.id !== thread.id));
      if (selectedThread?.id === thread.id) setSelectedThread(null);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.userName.toLowerCase().includes(q) ||
      (t.productName && t.productName.toLowerCase().includes(q)) ||
      (t.lastMessage && t.lastMessage.toLowerCase().includes(q))
    );
  });

  const unreadCount = threads.filter((t) => t.unreadCount > 0).length;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Main Tabs */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => setMainTab('chat')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            mainTab === 'chat'
              ? 'border-shopee-orange text-shopee-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Chat
          {unreadCount > 0 && (
            <span className="bg-shopee-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            mainTab === 'settings'
              ? 'border-shopee-orange text-shopee-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Pengaturan
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {mainTab === 'chat' ? (
          <>
            {/* Thread List (Left Panel) */}
            <div className={`${selectedThread ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[380px] border-r border-gray-200`}>
              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari chat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-shopee-orange"
                  />
                </div>

                {/* Sub Filter Tabs */}
                <div className="flex gap-1 overflow-x-auto">
                  {SUB_FILTERS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = subFilter === tab.value;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => setSubFilter(tab.value)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-shopee-orange text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {tab.label}
                        {tab.value === 'unread' && unreadCount > 0 && (
                          <span className={`ml-0.5 text-[10px] ${isActive ? 'text-white/80' : 'text-shopee-orange'}`}>
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thread List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">Belum ada chat</p>
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedThread?.id === thread.id ? 'bg-orange-50 border-l-2 border-l-shopee-orange' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-shopee-orange/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-shopee-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${thread.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {thread.userName}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                            {thread.lastMessageAt ? formatTime(thread.lastMessageAt) : ''}
                          </span>
                        </div>
                        {thread.productName && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            📦 {thread.productName}
                          </span>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                            {thread.lastMessage || 'Mulai percakapan...'}
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {thread.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-shopee-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {thread.unreadCount}
                              </span>
                            )}
                            {thread.status === 'closed' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Detail (Right Panel) */}
            <div className={`${selectedThread ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
              {selectedThread ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedThread(null)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-shopee-orange/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-shopee-orange" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedThread.userName}</p>
                        <p className="text-[11px] text-gray-400">
                          {selectedThread.productName || 'Chat Umum'}
                          {selectedThread.userPhone && ` · ${selectedThread.userPhone}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(selectedThread)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          selectedThread.status === 'open'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {selectedThread.status === 'open' ? '✅ Aktif' : '🔒 Selesai'}
                      </button>
                      <button
                        onClick={() => handleDeleteThread(selectedThread)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Belum ada pesan</div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          {msg.senderType === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                          )}
                          <div className={`rounded-lg px-3 py-2 max-w-[70%] ${
                            msg.senderType === 'admin'
                              ? 'bg-shopee-orange text-white rounded-br-none'
                              : 'bg-white text-gray-700 rounded-bl-none shadow-sm border border-gray-100'
                          }`}>
                            {msg.senderType === 'user' && <p className="text-[10px] text-gray-400 mb-0.5">{msg.senderName}</p>}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className={`text-[10px] mt-1 text-right ${msg.senderType === 'admin' ? 'text-white/60' : 'text-gray-400'}`}>
                              {formatFullTime(msg.createdAt)}
                            </p>
                          </div>
                          {msg.senderType === 'admin' && (
                            <div className="w-7 h-7 rounded-full bg-shopee-orange flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {selectedThread.status === 'open' ? (
                    <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
                      <div className="flex items-end gap-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Ketik balasan..."
                          rows={1}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-shopee-orange max-h-20"
                          style={{ minHeight: '38px' }}
                        />
                        <button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sending}
                          className="p-2 bg-shopee-orange text-white rounded-lg hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
                      <p className="text-xs text-gray-400">Chat ini sudah ditutup</p>
                      <button onClick={() => handleToggleStatus(selectedThread)} className="text-xs text-shopee-orange font-medium mt-1 hover:underline">
                        Buka kembali
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-4">
                  <div>
                    <MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Pilih chat untuk mulai membalas</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {threads.length} percakapan • {unreadCount} belum dibaca
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Settings Tab */
          <div className="flex-1 overflow-y-auto p-6">
            {loadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-2">Pengaturan Chat</h2>
                  <p className="text-sm text-gray-500">Atur pesan otomatis yang dikirim ke customer.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">💬 Pesan Sambutan (Greeting)</label>
                    <p className="text-xs text-gray-400 mb-2">Dikirim otomatis saat customer pertama kali chat.</p>
                    <textarea
                      value={greetingMessage}
                      onChange={(e) => setGreetingMessage(e.target.value)}
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-shopee-orange"
                      placeholder="Halo! 👋 Selamat datang. Ada yang bisa kami bantu?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🌙 Pesan Admin Offline</label>
                    <p className="text-xs text-gray-400 mb-2">Dikirim otomatis saat admin tidak aktif (lebih dari 5 menit tidak membalas).</p>
                    <textarea
                      value={offlineMessage}
                      onChange={(e) => setOfflineMessage(e.target.value)}
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-shopee-orange"
                      placeholder="Terima kasih telah menghubungi kami. Saat ini admin sedang offline..."
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="flex items-center gap-2 px-5 py-2.5 bg-shopee-orange text-white rounded-lg hover:bg-[#EA580C] disabled:opacity-50 transition-colors"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
