"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ClipboardList, Package, Truck, CheckCircle, Star, Clock, Loader2, MapPin, CreditCard, User, MessageSquare, Download } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";
import { generateShippingLabelPDF } from "@/lib/generate-shipping-label";
import { useAuth } from "@/app/components/layout/AuthProvider";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: string;
  total: string;
  image?: string | null;
  variation_id?: number | null;
  sku?: string | null;
  attributes?: Array<{ key: string; value: string; label: string }>;
}

interface CustomerOrder {
  id: number;
  code: string;
  status: string;
  total: string;
  subtotal: string;
  shipping_total: string;
  discount_total: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    phone: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
  };
  line_items: OrderItem[];
  coupon_lines?: Array<{ code: string; discount: string }>;
  shipping_lines?: Array<{ method_title: string; total: string }>;
  payment_method: string;
  payment_method_title: string;
  customer_note: string;
  meta_data?: Array<{ key: string; value: string }>;
  isPreorder?: boolean;
  preorderDays?: number;
}

const statusSteps = [
  { key: "pending", label: "Menunggu", icon: Clock },
  { key: "processing", label: "Dibayar", icon: CheckCircle },
  { key: "packed", label: "Dikemas", icon: Package },
  { key: "shipped", label: "Dikirim", icon: Truck },
  { key: "completed", label: "Selesai", icon: Star },
];

const statusLabel: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  processing: "Pembayaran Dikonfirmasi",
  packed: "Sedang Dikemas",
  shipped: "Dalam Pengiriman",
  completed: "Pesanan Selesai",
};

export default function OrderDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const { user } = useAuth();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code || !user?.phone) return;

    async function fetchOrder() {
      try {
        const phone = user?.phone;
        if (!phone) return;
        const res = await fetch(`/api/customer/orders/${code}`, {
          headers: { "x-user-phone": phone },
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else if (res.status === 404) {
          setError("Pesanan tidak ditemukan");
        } else {
          setError("Gagal memuat pesanan");
        }
      } catch (err) {
        setError("Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [code, user?.phone]);

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

  if (!order || error) {
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
                <p className="text-shopee-text-secondary text-sm">{error || "Pesanan tidak ditemukan"}</p>
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
                <span className="text-sm font-medium text-shopee-text">{order.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${order.status === "pending" ? "text-orange-500 bg-orange-50" : "text-green-600 bg-green-50"}`}>
                  {statusLabel[order.status] || order.status}
                </span>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-shopee-gray rounded-full" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-shopee-orange rounded-full transition-all"
                  style={{ width: `${(Math.max(0, currentStepIndex) / (statusSteps.length - 1)) * 100}%` }}
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
            </div>

            {/* Pre-order info */}
            {order.isPreorder && (
              <div className="bg-white lg:rounded-sm p-4 mt-1">
                <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Pesanan Pre-Order</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Estimasi pengiriman: {order.preorderDays || 7} hari setelah pembayaran
                </p>
                <p className="text-xs text-blue-600">
                  Estimasi barang sampai: {new Date(Date.now() + (order.preorderDays || 7) * 86400000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="bg-white lg:rounded-sm p-4 space-y-3">
              <h3 className="text-sm font-medium text-shopee-text">Produk Dipesan</h3>
              {order.line_items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 flex-shrink-0 bg-shopee-gray rounded-sm overflow-hidden">
                    <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-shopee-text line-clamp-2">{item.name}</p>
                    {item.sku && (
                      <p className="text-[11px] text-shopee-text-secondary mt-0.5">SKU: {item.sku}</p>
                    )}
                    {item.attributes && item.attributes.length > 0 && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        {item.attributes.map((attr, i) => (
                          <span key={i} className="text-[11px] text-shopee-text-secondary">
                            {attr.label}: <span className="text-shopee-text">{attr.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm font-medium text-shopee-text">{formatPrice(Number(item.price))}</span>
                      <span className="text-xs text-shopee-text-secondary">x{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white lg:rounded-sm p-4 space-y-2">
              <h3 className="text-sm font-medium text-shopee-text flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-shopee-text-secondary" />
                Ringkasan Pembayaran
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-shopee-text-secondary">Subtotal Produk</span>
                <span className="text-shopee-text">{formatPrice(Number(order.subtotal || order.total))}</span>
              </div>
              {order.shipping_total && parseFloat(order.shipping_total) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">Ongkos Kirim</span>
                  <span className="text-shopee-text">{formatPrice(Number(order.shipping_total))}</span>
                </div>
              )}
              {order.coupon_lines && order.coupon_lines.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">Voucher ({order.coupon_lines.map(c => c.code).join(', ')})</span>
                  <span className="text-green-600">-{formatPrice(Number(order.discount_total || 0))}</span>
                </div>
              )}
              {!order.coupon_lines?.length && order.discount_total && parseFloat(order.discount_total) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-shopee-text-secondary">Diskon</span>
                  <span className="text-green-600">-{formatPrice(Number(order.discount_total))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-shopee-border">
                <span className="text-shopee-text font-medium">Total Pembayaran</span>
                <span className="text-lg font-medium text-shopee-orange">{formatPrice(Number(order.total))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-shopee-text-secondary">Metode Pembayaran</span>
                <span className="text-shopee-text">
                  {order.payment_method === 'cod' ? 'Bayar di Tempat (COD)' :
                   order.payment_method === 'bacs' ? 'Transfer Bank' :
                   order.payment_method_title || 'Transfer / COD'}
                </span>
              </div>
            </div>

{/* Shipping Method */}
            <div className="bg-white lg:rounded-sm p-4 space-y-2">
              <h3 className="text-sm font-medium text-shopee-text flex items-center gap-2">
                <Truck className="w-4 h-4 text-shopee-orange" />
                Metode Pengiriman
              </h3>
              {(() => {
                const trackingId = order.meta_data?.find((m: any) => m.key === '_biteship_tracking_id')?.value;
                const waybillId = order.meta_data?.find((m: any) => m.key === '_biteship_waybill_id')?.value;
                const courier = order.meta_data?.find((m: any) => m.key === '_biteship_courier')?.value;
                const courierCode = courier ? courier.split('|')[0] : '';
                const courierService = courier ? courier.split('|')[1] || '' : '';
                const courierName = courierCode.toUpperCase();
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-shopee-text-secondary">Kurir</span>
                      <span className="text-shopee-text">{courierName || '-'}</span>
                    </div>
                    {waybillId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-shopee-text-secondary">No. Resi</span>
                        <span className="text-shopee-text font-mono text-xs">{waybillId}</span>
                      </div>
                    )}
                    {order.status === 'shipped' && waybillId && (
                    <button
                      onClick={() => {
                        generateShippingLabelPDF({
                          storeName: 'Shenar2168',
                          orderNumber: order.code || String(order.id),
                          courierName: courierName,
                          courierService: courierService,
                          waybillId: waybillId || '',
                          recipientName: `${order.shipping.first_name} ${order.shipping.last_name}`.trim(),
                          recipientPhone: order.billing.phone || '',
                          recipientAddress: `${order.shipping.address_1}, ${order.shipping.city}, ${order.shipping.state} ${order.shipping.postcode}`,
                          recipientCity: order.shipping.city,
                          recipientPostalCode: order.shipping.postcode,
                          senderName: 'Shenar Official Store',
                          senderPhone: '081234567890',
                          senderAddress: 'Pantai Indah Kapuk, Jakarta Utara',
                          senderCity: 'Jakarta Utara',
                          senderPostalCode: '14470',
                          weight: 0,
                          codAmount: 0,
                          items: order.line_items?.map((item: any) => ({
                            name: item.name,
                            variation: item.variation?.attributes?.map((a: any) => a.option).join(', ') || '',
                            quantity: item.quantity,
                          })) || [],
                        });
                      }}
                      className="mt-2 w-full py-2.5 bg-shopee-orange text-white text-sm font-medium rounded-sm hover:bg-[#D46A0A] transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Resi
                    </button>
                    )}
                  </>
                );
              })()}
            </div>


{/* Review section — only show if completed */}
            {order.status === 'completed' && (
              <div className="bg-white lg:rounded-sm p-4">
                <h3 className="text-sm font-medium text-shopee-text mb-3">Beri Ulasan</h3>
                <p className="text-xs text-shopee-text-secondary mb-3">
                  Pesanan sudah selesai. Bagikan pengalamanmu dengan produk ini.
                </p>
                <Link
                  href={`/profile/orders/${order.code}/review`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#d35400] transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Tulis Ulasan
                </Link>
              </div>
            )}
          </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}