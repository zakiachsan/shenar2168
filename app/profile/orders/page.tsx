"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ShoppingBag,
  PackageCheck,
  Truck,
  Star,
  Ban,
  ClipboardList,
  Loader2,
  Store,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import { useAuth } from "@/app/components/layout/AuthProvider";

const tabs = [
  { key: "all", label: "Semua" },
  { key: "packed", label: "Dikemas" },
  { key: "shipped", label: "Dikirim" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

interface LineItem {
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  price: string;
  total: string;
  image: string;
  variant?: string;
}

interface Order {
  id: number;
  orderCode: string | null;
  status: string;
  total: string;
  date_created: string;
  line_items: LineItem[];
  shipping_total: string;
  payment_method_title: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  processing: "Pembayaran Dikonfirmasi",
  on_hold: "Dikemas",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  failed: "Gagal",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-orange-500 bg-orange-50",
  processing: "text-blue-600 bg-blue-50",
  on_hold: "text-blue-500 bg-blue-50",
  completed: "text-green-600 bg-green-50",
  cancelled: "text-gray-500 bg-gray-100",
  refunded: "text-red-500 bg-red-50",
  failed: "text-red-500 bg-red-50",
};

function formatPrice(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getFilteredStatus(status: string): string {
  switch (status) {
    case "pending":
      return "unpaid";
    case "processing":
    case "on_hold":
      return "packed";
    case "completed":
      return "completed";
    case "cancelled":
    case "refunded":
    case "failed":
      return "cancelled";
    default:
      return "all";
  }
}

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
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

  const filtered = orders.filter((o) => {
    if (activeTab === "all") return true;
    return getFilteredStatus(o.status) === activeTab;
  });

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
        {/* Mobile back header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">
            Pesanan Saya
          </span>
        </div>

        <AuthGuard>
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
            {/* Desktop back */}
            <div className="hidden lg:flex items-center gap-2 mb-4">
              <Link href="/profile" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">
                Pesanan Saya
              </h1>
            </div>

            {/* Tabs */}
            <div className="bg-white lg:rounded-sm overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0 min-w-max">
                {tabs.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 min-w-[72px] px-2 py-3 text-[11px] sm:text-xs whitespace-nowrap transition-colors border-b-2 ${
                        active
                          ? "text-shopee-orange border-shopee-orange font-medium"
                          : "text-shopee-text-secondary border-transparent hover:text-shopee-text"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orders List */}
            <div className="mt-2 space-y-2 lg:space-y-3">
              {filtered.length === 0 ? (
                <div className="bg-white rounded-sm py-16 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                  <p className="text-shopee-text-secondary text-sm mb-1">
                    Belum Ada Pesanan
                  </p>
                  <p className="text-shopee-text-secondary text-xs mb-4">
                    {activeTab === "all"
                      ? "Kamu belum memiliki pesanan apapun."
                      : "Tidak ada pesanan dengan status ini."}
                  </p>
                  <Link
                    href="/"
                    className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:opacity-90"
                  >
                    Mulai Belanja
                  </Link>
                </div>
              ) : (
                filtered.map((order) => (
                  <Link
                    key={order.id}
                    href={`/profile/orders/${order.orderCode || order.id}`}
                    className="block bg-white lg:rounded-sm overflow-hidden hover:bg-gray-50 transition-colors"
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-shopee-border">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-shopee-text" />
                        <span className="text-xs font-medium text-shopee-text truncate max-w-[180px]">
                          Shenar2168 Official Store
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-sm font-medium ${
                          STATUS_COLOR[order.status] ||
                          "text-shopee-text-secondary bg-shopee-gray"
                        }`}
                      >
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </div>

                    {/* Product Items */}
                    <div className="px-3 py-2">
                      {order.line_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 py-1.5"
                        >
                          {/* Thumbnail */}
                          <div className="w-[60px] h-[60px] flex-shrink-0 bg-shopee-gray rounded overflow-hidden flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-shopee-text-secondary" />
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-shopee-text truncate leading-tight">
                              {item.name}
                            </p>
                            {item.variant && (
                              <p className="text-[10px] text-shopee-text-secondary mt-0.5 truncate">
                                {item.variant}
                              </p>
                            )}
                            <p className="text-[10px] text-shopee-text-secondary mt-0.5">
                              x{item.quantity}
                            </p>
                          </div>
                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-shopee-orange font-medium">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer */}
                    <div className="px-3 py-2 border-t border-shopee-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-shopee-text-secondary">
                            {order.line_items.length} produk
                            {parseFloat(order.shipping_total) > 0 &&
                              ` · Ongkir ${formatPrice(order.shipping_total)}`}
                          </p>
                          <p className="text-[10px] text-shopee-text-secondary mt-0.5">
                            {formatDate(order.date_created)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-shopee-text-secondary">
                            Total Belanja
                          </p>
                          <p className="text-sm text-shopee-orange font-semibold">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 mt-2.5 pb-1" onClick={(e) => e.preventDefault()}>
                        {order.status === "completed" && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/profile/orders/${order.orderCode || order.id}`); }}
                            className="px-4 py-1.5 border border-shopee-orange text-shopee-orange text-xs rounded-sm hover:bg-shopee-orange-light font-medium cursor-pointer"
                          >
                            Beli Lagi
                          </button>
                        )}

                      </div>
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
