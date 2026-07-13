"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Printer, Download, CheckCircle } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
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
  status: string;
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
  voucherDiscount?: number;
}

const paymentLabel: Record<string, string> = {
  midtrans: "Midtrans",
  ovo: "OVO",
  dana: "DANA",
  cod: "COD (Bayar di Tempat)",
};

export default function InvoicePage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("shenar2168-orders") || "[]");
    const found = stored.find((o: StoredOrder) => String(o.id) === orderId);
    setOrder(found || null);
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-20 min-h-screen flex items-center justify-center">
          <p className="text-shopee-text-secondary">Invoice tidak ditemukan</p>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen print:bg-white print:pb-0">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border print:hidden">
          <Link href={`/profile/orders/${order.id}`} className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Invoice</span>
        </div>

        <AuthGuard>
          <div className="max-w-[800px] mx-auto px-0 lg:px-4 py-0 lg:py-4 print:px-0 print:py-0">
            {/* Print Actions */}
            <div className="hidden lg:flex items-center justify-between mb-4 print:hidden">
              <Link href={`/profile/orders/${order.id}`} className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">Invoice</h1>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-shopee-orange/90 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Download / Print
              </button>
            </div>

            <div className="bg-white lg:rounded-sm p-6 lg:p-8 print:shadow-none print:border-0 print:p-0">
              {/* Invoice Header */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b border-shopee-border">
                <div>
                  <h2 className="text-2xl font-bold text-shopee-text">INVOICE</h2>
                  <p className="text-sm text-shopee-text-secondary mt-1">Shenar2168 Marketplace</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-shopee-text">{order.orderCode || order.id}</p>
                  <p className="text-xs text-shopee-text-secondary mt-0.5">
                    {new Date(order.date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  {order.status === "completed" ? "Pesanan Selesai" : order.status === "shipped" ? "Dalam Pengiriman" : order.status === "packed" ? "Sedang Dikemas" : "Menunggu Pembayaran"}
                </span>
              </div>

              {/* Items Table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-shopee-border">
                    <th className="text-left py-2 text-shopee-text-secondary font-normal">Produk</th>
                    <th className="text-right py-2 text-shopee-text-secondary font-normal w-20">Jumlah</th>
                    <th className="text-right py-2 text-shopee-text-secondary font-normal w-32">Harga</th>
                    <th className="text-right py-2 text-shopee-text-secondary font-normal w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={`${item.productId}-${item.variationId || 0}`} className="border-b border-shopee-border/50">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-12 h-12 object-cover rounded-sm bg-shopee-gray" />
                          <div>
                            <p className="text-shopee-text font-medium">{item.name}</p>
                            {item.variationId && <p className="text-xs text-shopee-text-secondary">Varian #{item.variationId}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right text-shopee-text">{item.quantity}</td>
                      <td className="py-3 text-right">
                        <span className="text-shopee-text">{formatPrice(item.price)}</span>
                        {(item.originalPrice || 0) > item.price && (
                          <span className="block text-xs text-shopee-text-secondary line-through">{formatPrice(item.originalPrice!)}</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-shopee-text font-medium">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-shopee-text-secondary">Total Harga ({order.items.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                  <span className="text-shopee-text">{formatPrice(order.originalSubtotal || order.subtotal || order.total)}</span>
                </div>
                {(order.productDiscount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-shopee-text-secondary">Diskon Produk</span>
                    <span className="text-red-500">-{formatPrice(order.productDiscount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-shopee-text-secondary">Biaya Pengiriman</span>
                  <span className="text-shopee-text">{formatPrice(order.shippingCost || 0)}</span>
                </div>
                {(order.voucherDiscount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-shopee-text-secondary">Diskon Voucher</span>
                    <span className="text-red-500">-{formatPrice(order.voucherDiscount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-shopee-border pt-2 mt-2">
                  <span className="text-shopee-text font-bold text-base">Total Pembayaran</span>
                  <span className="text-shopee-orange font-bold text-base">{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-shopee-text-secondary">Metode Pembayaran</span>
                  <span className="text-shopee-text">{paymentLabel[order.paymentMethod] || order.paymentMethod}</span>
                </div>
              </div>

              {/* Shipping Info */}
              <div className="border-t border-shopee-border pt-4 mb-6">
                <p className="text-sm font-medium text-shopee-text mb-2">Informasi Pengiriman</p>
                <p className="text-sm text-shopee-text-secondary">Kurir: {order.shippingCourier || order.shipping}</p>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-shopee-text-secondary border-t border-shopee-border pt-4">
                <p>Terima kasih telah berbelanja di Shenar2168 Marketplace</p>
                <p className="mt-1">© 2025 Shenar2168. Hak Cipta Dilindungi.</p>
              </div>
            </div>

            {/* Mobile Download Button */}
            <div className="lg:hidden p-4 print:hidden">
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 py-3 bg-shopee-orange text-white rounded-sm text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Invoice
              </button>
            </div>
          </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}
