/**
 * Order Confirmation Page
 * 
 * Displayed after successful checkout.
 * Shows order summary and payment instructions.
 * Also reads Midtrans redirect params to determine payment status immediately.
 */

"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ChevronLeft, Clock, CreditCard, Loader2, Package, Truck } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import { formatPrice } from "@/lib/data";

interface OrderData {
  id: number;
  total: string;
  status: string;
  payment_method?: string;
  payment_method_title?: string;
  date_created?: string;
  billing?: {
    first_name: string;
    last_name: string;
    phone: string;
    address_1: string;
  };
  meta_data?: Array<{ key: string; value: string }>;
}

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const orderCode = searchParams.get("code");
  // Read Midtrans redirect params
  const transactionStatus = searchParams.get("transaction_status");
  const statusCode = searchParams.get("status_code");

  // Determine if payment was successful from URL params (Midtrans redirect)
  // settlement or capture with status_code 200 = payment success
  const isPaidFromUrl = transactionStatus === "settlement" || 
                         (transactionStatus === "capture" && statusCode === "200");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const handlePayNow = async () => {
    if (!orderId) return;
    setPaying(true);
    try {
      const res = await fetch('/api/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, grossAmount: order?.total }),
      });
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert('Gagal membuat link pembayaran. Silakan coba lagi.');
      }
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("ID pesanan tidak ditemukan");
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/wc/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          setError("Gagal memuat detail pesanan");
        }
      } catch {
        setError("Terjadi kesalahan saat memuat pesanan");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  // Effective status: use URL params if they indicate payment success, otherwise use WC order status
  const effectiveStatus = isPaidFromUrl ? "processing" : (order?.status || "pending");
  const isPaid = effectiveStatus === "processing" || effectiveStatus === "completed";

  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Memuat pesanan...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 mb-4">{error}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-shopee-orange text-white rounded-sm text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Kembali ke Beranda
              </Link>
            </div>
          ) : order ? (
            <>
              {/* Success Header */}
              <div className="bg-white rounded-lg shadow-sm p-6 text-center mb-4">
                {isPaid ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                    <h1 className="text-xl font-bold text-gray-800 mb-1">
                      Pembayaran Berhasil!
                    </h1>
                    <p className="text-sm text-gray-500">
                      Terima kasih, pesanan Anda telah dibayar dan sedang diproses.
                    </p>
                  </>
                ) : (
                  <>
                    <Clock className="w-16 h-16 text-orange-500 mx-auto mb-3" />
                    <h1 className="text-xl font-bold text-gray-800 mb-1">
                      Pesanan Berhasil Dibuat
                    </h1>
                    <p className="text-sm text-gray-500">
                      Silakan selesaikan pembayaran sebelum pesanan dibatalkan.
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {orderCode ? `Kode Pesanan: ${orderCode}` : `Nomor Pesanan: #${order.id}`}
                </p>
              </div>

              {/* Payment Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-shopee-orange" />
                  Informasi Pembayaran
                </h2>
                {/* Pay Now button only for unpaid orders */}
                {!isPaid && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700 mb-2 font-medium">Pesanan Anda belum dibayar</p>
                    <button
                      onClick={handlePayNow}
                      disabled={paying}
                      className="w-full py-2.5 bg-shopee-orange text-white text-sm font-medium rounded-sm hover:bg-[#D46A0A] transition-colors disabled:opacity-50"
                    >
                      {paying ? "Memproses..." : "Bayar Sekarang"}
                    </button>
                  </div>
                )}
                {/* Paid confirmation */}
                {isPaid && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ Pembayaran telah dikonfirmasi
                    </p>
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Metode</span>
                    <span className="text-gray-800 font-medium">
                      {order.payment_method_title || order.payment_method || "Transfer Bank"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Pembayaran</span>
                    <span className="text-shopee-orange font-bold text-lg">
                      {formatPrice(parseFloat(order.total))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-shopee-orange" />
                  Ringkasan Pesanan
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={isPaid ? "text-green-600" : "text-orange-600 font-medium capitalize"}>
                      {isPaid ? "Dibayar" : order.status === "pending" ? "Menunggu Pembayaran" : order.status}
                    </span>
                  </div>
                  {order.billing && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Atas Nama</span>
                      <span className="text-gray-800">
                        {order.billing.first_name} {order.billing.last_name}
                      </span>
                    </div>
                  )}
                  {order.date_created && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tanggal</span>
                      <span className="text-gray-800">
                        {new Date(order.date_created).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping / Tracking */}
              {(() => {
                const trackingId = order.meta_data?.find((m) => m.key === "_biteship_tracking_id")?.value;
                const waybillId = order.meta_data?.find((m) => m.key === "_biteship_waybill_id")?.value;
                const courier = order.meta_data?.find((m) => m.key === "_biteship_courier")?.value;
                if (!trackingId && !waybillId) return null;
                return (
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                    <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-shopee-orange" />
                      Informasi Pengiriman
                    </h2>
                    <div className="space-y-2 text-sm">
                      {courier && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Kurir</span>
                          <span className="text-gray-800 font-medium">{courier.replace("|", " ").toUpperCase()}</span>
                        </div>
                      )}
                      {trackingId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tracking ID</span>
                          <span className="text-gray-800 font-mono text-xs">{trackingId}</span>
                        </div>
                      )}
                      {waybillId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">No. Resi</span>
                          <span className="text-gray-800 font-mono text-xs">{waybillId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-center gap-3">
                <Link
                  href={orderCode ? `/profile/orders/${orderCode}` : "/profile/orders"}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-shopee-orange text-shopee-orange rounded-sm text-sm hover:bg-shopee-orange-light transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Lihat Pesanan Saya
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-shopee-orange text-white rounded-sm text-sm hover:bg-shopee-orange/90 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Lanjutkan Belanja
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat...</span>
        </div>
      </div>
    }>
      <OrderConfirmedContent />
    </Suspense>
  );
}
