"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Ticket, Copy, CheckCircle } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import { useAuth } from "@/app/components/layout/AuthProvider";

interface WcCoupon {
  id: number;
  code: string;
  amount: string;
  discount_type: string;
  date_expires: string | null;
  minimum_amount: string;
  maximum_amount: string;
  usage_limit: number | null;
  usage_count: number;
  product_ids: number[];
  product_categories: number[];
  description: string;
  status: "active" | "expired" | "depleted";
}

interface Voucher {
  id: string;
  code: string;
  description: string;
  minOrder: number;
  discount: number;
  discountType: "fixed" | "percent";
  expiryDate: string | null;
  status: "active" | "used" | "expired";
  category?: string;
}

function mapWcToVoucher(c: WcCoupon): Voucher {
  const discountType = c.discount_type === "percent" || c.discount_type === "percent_product" ? "percent" : "fixed";
  const amount = parseFloat(c.amount) || 0;
  const minOrder = parseFloat(c.minimum_amount) || 0;

  // Build description from coupon data if CMS description is empty
  let description = c.description?.trim();
  if (!description) {
    if (discountType === "percent") {
      description = `Diskon ${amount}%`;
    } else {
      description = `Diskon Rp${amount.toLocaleString("id-ID")}`;
    }
  }

  // Map CMS status to UI status
  let uiStatus: Voucher["status"];
  if (c.status === "active") uiStatus = "active";
  else if (c.status === "expired" || c.status === "depleted") uiStatus = "expired";
  else uiStatus = "expired";

  return {
    id: String(c.id),
    code: c.code,
    description,
    minOrder,
    discount: amount,
    discountType,
    expiryDate: c.date_expires,
    status: uiStatus,
    category: c.product_categories?.length > 0 ? `Kategori ID: ${c.product_categories.join(", ")}` : "Semua Produk",
  };
}

export default function VouchersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"active" | "used" | "expired">("active");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/coupons");
        const data = await res.json();
        const cmsVouchers: Voucher[] = (data.coupons || []).map(mapWcToVoucher);

        // Detect used vouchers from localStorage order history
        const usedCodes = new Set<string>();
        try {
          const orders = JSON.parse(localStorage.getItem("shenar2168-orders") || "[]");
          orders.forEach((o: any) => {
            if (o.couponCode) usedCodes.add(o.couponCode.toUpperCase());
          });
        } catch {
          // ignore
        }

        const enriched = cmsVouchers.map((v) => {
          if (usedCodes.has(v.code.toUpperCase()) && v.status === "active") {
            return { ...v, status: "used" as const };
          }
          return v;
        });

        if (!cancelled) setVouchers(enriched);
      } catch {
        if (!cancelled) setVouchers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = vouchers.filter((v) => v.status === activeTab);

  const formatDate = (iso: string | null) => {
    if (!iso) return "Tidak ada batas waktu";
    try {
      return new Date(iso).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  };

  const isExpired = (iso: string | null) => !!iso && new Date(iso) < new Date();

  const [toast, setToast] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setToast(`Kode voucher ${code} berhasil disalin`);
    setTimeout(() => setCopiedId(null), 2000);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Voucher Saya</span>
        </div>

        <AuthGuard>
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
            <div className="hidden lg:flex items-center gap-2 mb-4">
              <Link href="/profile" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">Voucher Saya</h1>
            </div>

            {/* Tabs */}
            <div className="bg-white lg:rounded-sm overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0 min-w-max">
                {(["active", "used", "expired"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-center px-6 py-3 text-xs whitespace-nowrap transition-colors border-b-2 capitalize ${
                      activeTab === tab
                        ? "text-shopee-orange border-shopee-orange font-medium"
                        : "text-shopee-text-secondary border-transparent hover:text-shopee-text"
                    }`}
                  >
                    {tab === "active" ? "Aktif" : tab === "used" ? "Sudah Digunakan" : "Kadaluarsa"}
                  </button>
                ))}
              </div>
            </div>

            {/* Vouchers List */}
            <div className="mt-3 space-y-2 px-3 lg:px-0">
              {loading ? (
                <div className="bg-white rounded-sm py-16 text-center">
                  <p className="text-shopee-text-secondary text-sm">Memuat voucher...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-sm py-16 text-center">
                  <Ticket className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                  <p className="text-shopee-text-secondary text-sm mb-1">
                    {activeTab === "active" ? "Belum Ada Voucher Aktif" : activeTab === "used" ? "Belum Ada Voucher Terpakai" : "Belum Ada Voucher Kadaluarsa"}
                  </p>
                  <p className="text-shopee-text-secondary text-xs mb-4">
                    {activeTab === "active" ? "Voucher promo akan muncul di sini." : "Riwayat voucher akan muncul di sini."}
                  </p>
                  <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                    Mulai Belanja
                  </Link>
                </div>
              ) : (
                filtered.map((v) => (
                  <div
                    key={v.id}
                    className={`bg-white lg:rounded-sm p-3.5 flex items-center gap-3 ${v.status !== "active" ? "opacity-60" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-shopee-orange-light flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5 text-shopee-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-shopee-text truncate">{v.description}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium shrink-0 ${
                          v.status === "active" ? "text-green-600 bg-green-50" : v.status === "used" ? "text-shopee-text-secondary bg-shopee-gray" : "text-red-500 bg-red-50"
                        }`}>
                          {v.status === "active" ? "Aktif" : v.status === "used" ? "Terpakai" : "Kadaluarsa"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-shopee-text-secondary">
                          Min. Rp{v.minOrder.toLocaleString("id-ID")}
                        </span>
                        <span className="text-[10px] text-shopee-border">|</span>
                        <span className="text-[11px] text-shopee-text-secondary">
                          {formatDate(v.expiryDate)}
                        </span>
                      </div>
                    </div>
                    {v.status === "active" && !isExpired(v.expiryDate) && (
                      <button
                        onClick={() => copyCode(v.code, v.id)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-shopee-orange text-shopee-orange hover:bg-shopee-orange-light transition-colors"
                        title={copiedId === v.id ? "Tersalin" : `Salin ${v.code}`}
                      >
                        {copiedId === v.id ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </AuthGuard>
      </main>
      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            {toast}
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}
