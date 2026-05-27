"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ClipboardList, Package, Truck, CheckCircle, Star, Clock, Loader2, FileText } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import ReviewForm from "@/app/components/reviews/ReviewForm";
import { formatPrice, NO_IMAGE_PLACEHOLDER } from "@/lib/data";

interface OrderItem {
  productId: number;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  variationId?: number;
}

interface StoredOrder {
  id: string;
  orderCode?: string;
  status: "pending" | "processing" | "packed" | "shipped" | "completed";
  items: OrderItem[];
  subtotal?: number;
  originalSubtotal?: number;
  productDiscount?: number;
  total: number;
  date: string;
  shipping: string;
  shippingCost?: number;
  paymentMethod: string;
  shippingCourier?: string;
  trackingId?: string;
  waybillId?: string;
  biteshipStatus?: string;
  voucherDiscount?: number;
}

const shippingLabel: Record<string, string> = {
  jne: "JNE Reguler",
  jnt: "J&T Express",
  sicepat: "SiCepat",
};

const paymentLabel: Record<string, string> = {
  midtrans: "Midtrans",
  ovo: "OVO",
  dana: "DANA",
  cod: "COD (Bayar di Tempat)",
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewedProducts, setReviewedProducts] = useState<Set<number>>(new Set());
  const [trackingHistory, setTrackingHistory] = useState<any[]>([]);

  // Load from localStorage first
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("shenar2168-orders") || "[]");
    const found = stored.find((o: StoredOrder) => String(o.id) === orderId);
    setOrder(found || null);
    setLoading(false);
  }, [orderId]);

  // Sync order status from WooCommerce API
  useEffect(() => {
    if (!orderId) return;
    async function syncStatus() {
      try {
        const res = await fetch(`/api/wc/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setOrder(prev => {
              if (!prev) return prev;
              // Update status and also sync to localStorage
              const updated = { ...prev, status: data.status };
              const stored = JSON.parse(localStorage.getItem("shenar2168-orders") || "[]");
              const updatedStored = stored.map((o: StoredOrder) => (String(o.id) === orderId ? { ...o, status: data.status } : o));
              localStorage.setItem("shenar2168-orders", JSON.stringify(updatedStored));
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("Failed to sync order status:", err);
      }
    }
    syncStatus();
  }, [orderId]);

  const markCompleted = () => {
    if (!order) return;
    const updated = { ...order, status: "completed" as const };
    setOrder(updated);
    const stored = JSON.parse(localStorage.getItem("shenar2168-orders") || "[]");
    const updatedStored = stored.map((o: StoredOrder) => (String(o.id) === orderId ? updated : o));
    localStorage.setItem("shenar2168-orders", JSON.stringify(updatedStored));
  };

  const [payingOrder, setPayingOrder] = useState(false);

  const handlePayNow = async () => {
    if (!order) return;
    setPayingOrder(true);
    try {
      const res = await fetch('/api/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          grossAmount: order.total,
          customerName: order.items?.[0]?.name || 'Customer',
          items: order.items.map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          shippingCost: order.shippingCost,
          voucherDiscount: order.voucherDiscount,
        }),
      });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert('Gagal membuat link pembayaran. Silakan coba lagi.');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat memproses pembayaran.');
    } finally {
      setPayingOrder(false);
    }
  };

  const handleReviewSuccess = (productId: number) => {
    setReviewedProducts((prev) => new Set(prev).add(productId));
  };

  const fetchTracking = async () => {
    if (!order?.waybillId || !order?.shippingCourier) return;
    try {
      const res = await fetch(`/api/biteship/tracking?waybillId=${order.waybillId}&courier=${order.shippingCourier}`);
      const data = await res.json();
      if (data.history) {
        setTrackingHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch tracking:", err);
    }
  };

  const statusSteps = [
    { key: "pending", label: "Menunggu", icon: Clock },
    { key: "processing", label: "Dibayar", icon: CheckCircle },
    { key: "packed", label: "Dikemas", icon: Package },
    { key: "shipped", label: "Dikirim", icon: Truck },
    { key: "completed", label: "Selesai", icon: Star },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order?.status);

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

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-20 min-h-screen">
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
            <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
              <Link href="/profile/orders" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <span className="text-base font-medium text-shopee-text">Detail Pesanan</span>
            </div>
            <AuthGuard>
              <div className="bg-white lg:rounded-sm py-16 text-center mt-3 lg:mt-0">
                <ClipboardList className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                <p className="text-shopee-text-secondary text-sm">Pesanan tidak ditemukan</p>
                <Link href="/profile/orders" className="inline-block mt-4 px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm">
                  Kembali ke Pesanan
                </Link>
              </div>
            </AuthGuard>
          </div>
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
          <Link href="/profile/orders" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Detail Pesanan</span>
        </div>

        <AuthGuard>
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4 space-y-3">
            <div className="hidden lg:flex items-center gap-2 mb-4">
              <Link href="/profile/orders" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">Detail Pesanan</h1>
            </div>

            {/* Status */}
            <div className="bg-white lg:rounded-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-shopee-text">{order.orderCode || order.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${order.status === "pending" ? "text-orange-500 bg-orange-50" : "text-green-600 bg-green-50"}`}>
                  {order.status === "pending" ? "Menunggu Pembayaran" : order.status === "processing" ? "Pembayaran Dikonfirmasi" : order.status === "packed" ? "Sedang Dikemas" : order.status === "shipped" ? "Dalam Pengiriman" : "Pesanan Selesai"}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-shopee-gray rounded-full" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-shopee-orange rounded-full transition-all"
                  style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                />
                {statusSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const active = idx <= currentStepIndex;
                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center gap-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          active ? "bg-shopee-orange border-shopee-orange text-white" : "bg-white border-shopee-border text-shopee-text-secondary"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] ${active ? "text-shopee-orange font-medium" : "text-shopee-text-secondary"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {order.status === "pending" && (
                <button
                  onClick={handlePayNow}
                  disabled={payingOrder}
                  className="mt-4 w-full py-2.5 bg-shopee-orange text-white text-sm font-medium rounded-sm hover:bg-[#D46A0A] transition-colors disabled:opacity-50"
                >
                  {payingOrder ? "Memproses..." : "Bayar Sekarang"}
                </button>
              )}
              {order.status === "shipped" && (
                <button
                  onClick={markCompleted}
                  className="mt-4 w-full py-2 border border-green-500 text-green-600 text-sm rounded-sm hover:bg-green-50 transition-colors"
                >
                  Tandai Pesanan Selesai
                </button>
              )}
            </div>

            {/* Items */}
            <div className="bg-white lg:rounded-sm p-4 space-y-3">
              <h3 className="text-sm font-medium text-shopee-text">Produk Dipesan</h3>
              {order.items.map((item) => (
                <div key={`${item.productId}-${item.variationId || 0}`} className="flex gap-3">
                  <div className="w-16 h-16 flex-shrink-0 bg-shopee-gray rounded-sm overflow-hidden">
                    <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.productId}`} className="text-sm text-shopee-text line-clamp-2 hover:text-shopee-orange">
                      {item.name}
                    </Link>
                    {item.variationId && <p className="text-xs text-blue-600 mt-0.5">Varian #{item.variationId}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm text-shopee-orange font-medium">{formatPrice(item.price)}</span>
                      {(item.originalPrice || 0) > item.price && (
                        <span className="text-xs text-shopee-text-secondary line-through">{formatPrice(item.originalPrice!)}</span>
                      )}
                      <span className="text-xs text-shopee-text-secondary ml-auto">x{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Summary */}
            <div className="bg-white lg:rounded-sm p-4 space-y-2">
              <h3 className="text-sm font-medium text-shopee-text">Ringkasan Pembayaran</h3>
              <div className="flex justify-between text-sm">
                <span className="text-shopee-text-secondary">Total Harga ({order.items.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                <span className="text-shopee-text">{formatPrice(order.originalSubtotal || order.subtotal || order.total)}</span>
              </div>
              {(order.productDiscount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">Diskon Produk</span>
                  <span className="text-red-500">-{formatPrice(order.productDiscount!)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-shopee-text-secondary">Biaya Pengiriman</span>
                <span className="text-shopee-text">{formatPrice(order.shippingCost || 0)}</span>
              </div>
              {(order.voucherDiscount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">Diskon Voucher</span>
                  <span className="text-red-500">-{formatPrice(order.voucherDiscount!)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-shopee-border pt-2 mt-1">
                <span className="text-shopee-text font-medium">Total Pembayaran</span>
                <span className="text-shopee-orange font-bold text-base">{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-white lg:rounded-sm p-4 space-y-2">
              <h3 className="text-sm font-medium text-shopee-text flex items-center gap-2">
                <Truck className="w-4 h-4 text-shopee-orange" />
                Metode Pengiriman
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-shopee-text-secondary">Kurir</span>
                <span className="text-shopee-text">{order.shippingCourier || shippingLabel[order.shipping] || order.shipping}</span>
              </div>
              {order.waybillId && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">No. Resi</span>
                  <span className="text-shopee-text font-mono text-xs">{order.waybillId}</span>
                </div>
              )}
              {order.biteshipStatus && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">Status Kurir</span>
                  <span className="text-shopee-text capitalize">{order.biteshipStatus}</span>
                </div>
              )}
              {order.waybillId && (
                <button
                  onClick={fetchTracking}
                  className="mt-2 w-full py-2 bg-shopee-orange-light text-shopee-orange text-sm rounded-sm hover:bg-shopee-orange hover:text-white transition-colors"
                >
                  Lacak Pengiriman
                </button>
              )}
              {trackingHistory.length > 0 && (
                <div className="mt-2 space-y-2 border-t border-shopee-border pt-2">
                  <p className="text-xs font-medium text-shopee-text">Riwayat Pengiriman</p>
                  {trackingHistory.map((t: any, i: number) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-shopee-text-secondary whitespace-nowrap">{t.date || t.updated_at}</span>
                      <span className="text-shopee-text">{t.note || t.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice */}
            <div className="bg-white lg:rounded-sm p-4">
              <Link
                href={`/profile/orders/${order.id}/invoice`}
                className="block w-full py-2.5 border border-shopee-orange text-shopee-orange text-sm rounded-sm text-center hover:bg-shopee-orange-light transition-colors"
              >
                Lihat Invoice
              </Link>
            </div>

            {/* Review Section - only for completed orders */}
            {order.status === "completed" && (
              <div className="bg-white lg:rounded-sm p-4 space-y-4">
                <h3 className="text-sm font-medium text-shopee-text flex items-center gap-2">
                  <Star className="w-4 h-4 text-shopee-orange" />
                  Beri Ulasan
                </h3>
                {order.items.map((item) => (
                  <div key={`review-${item.productId}`} className="space-y-3">
                    {reviewedProducts.has(item.productId) ? (
                      <div className="bg-green-50 border border-green-200 rounded-sm p-3 text-center">
                        <p className="text-sm text-green-700">Ulasan untuk <strong>{item.name}</strong> telah dikirim.</p>
                      </div>
                    ) : (
                      <ReviewForm
                        productId={item.productId}
                        productName={item.name}
                        onSuccess={() => handleReviewSuccess(item.productId)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}
