"use client";

import Link from "next/link";
import { ChevronLeft, Bell, ShoppingBag, Tag, Truck, Info } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";

const notifications = [
  { id: 1, type: "order", title: "Pesanan Dikirim", message: "Pesanan ORD-002 telah dikirim oleh kurir.", time: "2 jam lalu", icon: Truck, color: "text-shopee-orange bg-shopee-orange-light" },
  { id: 2, type: "promo", title: "Flash Sale 5.5", message: "Jangan lewatkan Flash Sale besok pukul 00:00!", time: "5 jam lalu", icon: Tag, color: "text-red-500 bg-red-50" },
  { id: 3, type: "order", title: "Pesanan Diterima", message: "Pesanan ORD-001 telah diterima. Beri rating yuk!", time: "1 hari lalu", icon: ShoppingBag, color: "text-green-600 bg-green-50" },
  { id: 4, type: "info", title: "Update Aplikasi", message: "Versi terbaru telah tersedia dengan fitur menarik.", time: "2 hari lalu", icon: Info, color: "text-blue-500 bg-blue-50" },
];

export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Notifikasi</span>
        </div>

        <AuthGuard>
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center gap-2 mb-4">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Notifikasi</h1>
          </div>

          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <div key={n.id} className="bg-white lg:rounded-sm p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-shopee-text">{n.title}</p>
                    <p className="text-xs text-shopee-text-secondary mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-shopee-text-secondary mt-1">{n.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}
