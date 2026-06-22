"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ClipboardList, ShoppingBag, PackageCheck, Truck, Star, Loader2 } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import { useAuth } from "@/app/components/layout/AuthProvider";

const tabs = [
  { key: "all", label: "Semua", icon: ClipboardList },
  { key: "unpaid", label: "Menunggu", icon: ShoppingBag },
  { key: "packed", label: "Dikemas", icon: PackageCheck },
  { key: "shipped", label: "Dikirim", icon: Truck },
  { key: "completed", label: "Selesai", icon: Star },
];

interface OrderSummary {
  code: string;
  woo_order_id: number;
  created_at: string;
  status?: string;
  total?: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.phone) return;

    async function fetchOrders() {
      try {
        const phone = user?.phone;
        if (!phone) return;
        const res = await fetch("/api/customer/orders", {
          headers: { "x-user-phone": phone },
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user?.phone]);

  const filtered = activeTab === "all" ? orders : orders.filter((o) => {
    if (activeTab === "unpaid") return o.status === "processing" || o.status === "pending";
    return o.status === activeTab;
  });

  const statusLabel: Record<string, string> = {
    pending: "Menunggu Pembayaran",
    processing: "Pembayaran Dikonfirmasi",
    packed: "Sedang Dikemas",
    shipped: "Dalam Pengiriman",
    completed: "Pesanan Selesai",
    cancelled: "Dibatalkan",
  };

  const statusColor: Record<string, string> = {
    pending: "text-orange-500 bg-orange-50",
    processing: "text-blue-600 bg-blue-50",
    packed: "text-blue-500 bg-blue-50",
    shipped: "text-shopee-orange bg-shopee-orange-light",
    completed: "text-green-600 bg-green-50",
    cancelled: "text-gray-500 bg-gray-100",
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-20 min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Pesanan Saya</span>
        </div>

        <AuthGuard>
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
            <div className="hidden lg:flex items-center gap-2 mb-4">
              <Link href="/profile" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">Pesanan Saya</h1>
            </div>

            {/* Tabs */}
            <div className="bg-white lg:rounded-sm overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0 min-w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs whitespace-nowrap transition-colors border-b-2 ${
                        active
                          ? "text-shopee-orange border-shopee-orange font-medium"
                          : "text-shopee-text-secondary border-transparent hover:text-shopee-text"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orders List */}
            <div className="mt-3 space-y-3">
              {filtered.length === 0 ? (
                <div className="bg-white rounded-sm py-16 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                  <p className="text-shopee-text-secondary text-sm mb-1">Belum Ada Pesanan</p>
                  <p className="text-shopee-text-secondary text-xs mb-4">
                    {activeTab === "all" ? "Kamu belum memiliki pesanan apapun." : `Tidak ada pesanan dengan status ini.`}
                  </p>
                  <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                    Mulai Belanja
                  </Link>
                </div>
              ) : (
                filtered.map((order) => (
                  <Link key={order.code} href={`/profile/orders/${order.code}`} className="block bg-white lg:rounded-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-shopee-text-secondary font-mono">{order.code}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${statusColor[order.status || ""] || "text-shopee-text-secondary bg-shopee-gray"}`}>
                        {statusLabel[order.status || ""] || order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-shopee-text-secondary">{formatDate(order.created_at)}</span>
                      <span className="text-sm text-shopee-orange font-medium">
                        Pesanan #{order.woo_order_id}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}
