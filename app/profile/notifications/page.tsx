'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, ShoppingBag, Tag, Info, Star, Package, Check, CheckCheck, Loader2 } from 'lucide-react';
import Header from '@/app/components/layout/Header';
import BottomNav from '@/app/components/layout/BottomNav';
import { useAuth } from '@/app/components/layout/AuthProvider';

interface Notification {
  id: number;
  type: 'order' | 'review' | 'stock' | 'promo' | 'system';
  title: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  order: { icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
  review: { icon: Star, color: 'text-yellow-600 bg-yellow-50' },
  stock: { icon: Package, color: 'text-red-600 bg-red-50' },
  promo: { icon: Tag, color: 'text-purple-600 bg-purple-50' },
  system: { icon: Info, color: 'text-gray-600 bg-gray-100' },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const phoneHeaders = user?.phone ? { 'X-Customer-Phone': user.phone } : {};

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: phoneHeaders });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...phoneHeaders },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event('notifications-read'));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...phoneHeaders },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('notifications-read'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Notifikasi</span>
          {unreadCount > 0 && (
            <span className="ml-auto text-xs bg-shopee-orange text-white px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/profile" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">Notifikasi</h1>
              {unreadCount > 0 && (
                <span className="text-xs bg-shopee-orange text-white px-2 py-0.5 rounded-full">
                  {unreadCount} belum dibaca
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-shopee-orange hover:bg-orange-50 rounded-lg transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Tandai Semua Dibaca
              </button>
            )}
          </div>

          {!user ? (
            <div className="text-center py-12 bg-white">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Silakan login untuk melihat notifikasi</p>
              <Link href="/profile" className="text-sm text-shopee-orange hover:underline mt-2 inline-block">
                Login Sekarang
              </Link>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Memuat notifikasi...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={`bg-white lg:rounded-sm p-4 flex items-start gap-3 ${
                      !n.is_read ? 'border-l-4 border-shopee-orange' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold text-shopee-text' : 'text-shopee-text'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-shopee-text-secondary mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-shopee-text-secondary">{timeAgo(n.created_at)}</p>
                        {!n.is_read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="text-[10px] text-shopee-orange hover:underline flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" />
                            Tandai dibaca
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
