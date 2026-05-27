"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  User,
  MapPin,
  ClipboardList,
  Heart,
  Bell,
  HelpCircle,
  Settings,
  ChevronRight,
  Star,
  ShoppingBag,
  Truck,
  PackageCheck,
  LogOut,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import { useAuth } from "@/app/components/layout/AuthProvider";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  requireAuth?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Pesanan Saya",
    items: [
      { icon: ClipboardList, label: "Semua Pesanan", href: "/profile/orders", requireAuth: true },
      { icon: ShoppingBag, label: "Menunggu Pembayaran", href: "/profile/orders?status=unpaid", requireAuth: true },
      { icon: PackageCheck, label: "Dikemas", href: "/profile/orders?status=packed", requireAuth: true },
      { icon: Truck, label: "Dikirim", href: "/profile/orders?status=shipped", requireAuth: true },
      { icon: Star, label: "Selesai", href: "/profile/orders?status=completed", requireAuth: true },
    ],
  },
  {
    title: "Layanan Saya",
    items: [
      { icon: Heart, label: "Favorit Saya", href: "/profile/favorites", requireAuth: true },
      { icon: Bell, label: "Notifikasi", href: "/profile/notifications", requireAuth: true },
      { icon: MapPin, label: "Alamat Pengiriman", href: "/profile/address", requireAuth: true },
      { icon: Settings, label: "Pengaturan", href: "/profile/settings", requireAuth: false },
      { icon: HelpCircle, label: "Pusat Bantuan", href: "/profile/help", requireAuth: false },
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, openLogin } = useAuth();
  const [voucherCount, setVoucherCount] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    if (!user) {
      setVoucherCount(0);
      setCoins(0);
      return;
    }
    // Fetch active voucher count from backend
    fetch('/api/coupons')
      .then((res) => res.json())
      .then((data) => setVoucherCount(data.count || 0))
      .catch(() => setVoucherCount(0));

    // Fetch user coins from backend
    fetch(`/api/user-stats?phone=${encodeURIComponent(user.phone)}`)
      .then((res) => res.json())
      .then((data) => setCoins(data.coins || 0))
      .catch(() => setCoins(0));
  }, [user]);

  const handleMenuClick = (item: MenuItem) => {
    if (item.requireAuth && !user) {
      openLogin();
      return;
    }
    router.push(item.href);
  };

  return (
    <>
      <Header />

      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Profil Saya</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          {/* Profile Card */}
          <div className="bg-shopee-orange px-4 py-5 lg:rounded-sm">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-base">{user?.name || "Pengguna Baru"}</p>
                <p className="text-white/80 text-xs">{user ? (user.phone.startsWith("62") ? `+${user.phone}` : `+62 ${user.phone}`) : "-"}</p>
              </div>
              {user && (
                <Link
                  href="#"
                  className="text-white text-xs border border-white/40 px-3 py-1 rounded-sm hover:bg-white/10 transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-0 mt-4 pt-4 border-t border-white/20">
              {[
                { label: "Voucher", value: voucherCount, href: "/profile/vouchers" },
                { label: "Koin", value: coins, href: "/profile/coins" },
              ].map((stat) => (
                <Link key={stat.label} href={stat.href} className="text-center hover:bg-white/10 rounded-sm py-1 transition-colors">
                  <p className="text-white font-medium text-sm">
                    {typeof stat.value === 'number' && stat.value >= 1000
                      ? `${(stat.value / 1000).toFixed(1).replace(/\.0$/, '')}rb`
                      : stat.value}
                  </p>
                  <p className="text-white/70 text-[10px]">{stat.label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Menu Groups */}
          <div className="mt-3 space-y-3">
            {menuGroups.map((group) => (
              <div key={group.title} className="bg-white lg:rounded-sm">
                <p className="px-4 py-2.5 text-xs font-medium text-shopee-text-secondary border-b border-shopee-border/50">
                  {group.title}
                </p>
                <div className="grid grid-cols-5 gap-0">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleMenuClick(item)}
                        className="flex flex-col items-center gap-1 py-3 hover:bg-shopee-gray transition-colors cursor-pointer"
                      >
                        <Icon className="w-5 h-5 text-shopee-text-secondary" strokeWidth={1.5} />
                        <span className="text-[10px] text-shopee-text text-center leading-tight px-1">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Other Links */}
          <div className="mt-3 bg-white lg:rounded-sm">
            {[
              { label: "Kebijakan Privasi", href: "/profile/privacy" },
              { label: "Syarat & Ketentuan", href: "/profile/terms" },
              { label: "Hubungi Kami", href: "/profile/contact" },
            ].map((link, i, arr) => (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center justify-between px-4 py-3 hover:bg-shopee-gray transition-colors ${
                  i < arr.length - 1 ? "border-b border-shopee-border/50" : ""
                }`}
              >
                <span className="text-sm text-shopee-text">{link.label}</span>
                <ChevronRight className="w-4 h-4 text-shopee-text-secondary" />
              </Link>
            ))}
          </div>

          {/* Logout CTA */}
          <div className="mt-3 bg-white lg:rounded-sm p-4">
            {user ? (
              <button
                onClick={logout}
                className="w-full py-3 bg-red-50 text-red-500 text-sm font-medium rounded-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Keluar Akun
              </button>
            ) : (
              <button
                onClick={openLogin}
                className="w-full py-3 bg-shopee-orange text-white text-sm font-medium rounded-sm hover:bg-[#1A7BD4] transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </>
  );
}
