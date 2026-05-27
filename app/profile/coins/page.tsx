"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Coins, ArrowUpRight, ArrowDownLeft, ShoppingBag, Gift, HelpCircle, Settings } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import { useAuth } from "@/app/components/layout/AuthProvider";

interface CoinTransaction {
  id: string;
  type: "earn" | "spend";
  amount: number;
  description: string;
  date: string;
}

interface PointsConfig {
  enabled: boolean;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxPoints: number;
  caption: string;
}

export default function CoinsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.phone) {
      setBalance(0);
      setTransactions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [statsRes, settingsRes] = await Promise.all([
          fetch(`/api/user-stats?phone=${encodeURIComponent(user!.phone)}`),
          fetch("/api/settings"),
        ]);
        const statsData = await statsRes.json();
        const settingsData = await settingsRes.json();
        if (!cancelled) {
          setBalance(statsData.coins || 0);
          setTransactions(Array.isArray(statsData.transactions) ? statsData.transactions : []);
          setPointsConfig(settingsData.points || null);
        }
      } catch {
        if (!cancelled) {
          setBalance(0);
          setTransactions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const totalEarned = transactions.filter((t) => t.type === "earn").reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions.filter((t) => t.type === "spend").reduce((sum, t) => sum + t.amount, 0);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return iso;
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
          <span className="text-base font-medium text-shopee-text">Koin Saya</span>
        </div>

        <AuthGuard>
          <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
            <div className="hidden lg:flex items-center gap-2 mb-4">
              <Link href="/profile" className="p-1">
                <ChevronLeft className="w-5 h-5 text-shopee-text" />
              </Link>
              <h1 className="text-lg font-medium text-shopee-text">Koin Saya</h1>
            </div>

            {/* Balance Card */}
            <div className="bg-shopee-orange px-4 py-6 lg:rounded-sm text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs">Saldo Koin</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Coins className="w-6 h-6" />
                    <span className="text-2xl font-bold">{balance.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <Link
                  href="/"
                  className="text-white text-xs border border-white/40 px-3 py-1.5 rounded-sm hover:bg-white/10 transition-colors flex items-center gap-1"
                >
                  <Gift className="w-3.5 h-3.5" />
                  Tukar Koin
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/20">
                <div>
                  <div className="flex items-center gap-1 text-white/70 text-[10px]">
                    <ArrowUpRight className="w-3 h-3" />
                    Total Masuk
                  </div>
                  <p className="text-white font-medium text-sm mt-0.5">+{totalEarned.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-white/70 text-[10px]">
                    <ArrowDownLeft className="w-3 h-3" />
                    Total Keluar
                  </div>
                  <p className="text-white font-medium text-sm mt-0.5">-{totalSpent.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="mt-3 bg-white lg:rounded-sm">
              <div className="px-4 py-3 border-b border-shopee-border/50 flex items-center justify-between">
                <p className="text-xs font-medium text-shopee-text-secondary">Riwayat Transaksi</p>
                <span className="text-[10px] text-shopee-text-secondary">{transactions.length} transaksi</span>
              </div>
              {loading ? (
                <div className="py-16 text-center">
                  <p className="text-shopee-text-secondary text-sm">Memuat riwayat koin...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center">
                  <Coins className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                  <p className="text-shopee-text-secondary text-sm">Belum Ada Transaksi</p>
                  <p className="text-shopee-text-secondary text-xs mt-1">Mulai berbelanja untuk dapatkan koin.</p>
                  <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4] mt-4">
                    Mulai Belanja
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-shopee-border/50">
                  {transactions.map((t) => (
                    <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        t.type === "earn" ? "bg-green-50" : "bg-orange-50"
                      }`}>
                        {t.type === "earn" ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-shopee-orange" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-shopee-text truncate">{t.description}</p>
                        <p className="text-[10px] text-shopee-text-secondary">{formatDate(t.date)}</p>
                      </div>
                      <span className={`text-sm font-medium shrink-0 ${
                        t.type === "earn" ? "text-green-600" : "text-shopee-orange"
                      }`}>
                        {t.type === "earn" ? "+" : "-"}{t.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Point Rules */}
            {pointsConfig?.enabled && (
              <div className="mt-3 bg-white lg:rounded-sm p-4">
                <p className="text-xs font-medium text-shopee-text mb-3 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Aturan Poin Saat Ini
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-shopee-text-secondary">Tipe</span>
                    <span className="text-shopee-text font-medium">
                      {pointsConfig.type === "percent" ? "Persentase" : "Fix Point"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-shopee-text-secondary">Nilai</span>
                    <span className="text-shopee-text font-medium">
                      {pointsConfig.type === "percent" ? `${pointsConfig.value}%` : `${pointsConfig.value} poin`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-shopee-text-secondary">Minimal Transaksi</span>
                    <span className="text-shopee-text font-medium">
                      Rp {pointsConfig.minOrder.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {pointsConfig.maxPoints > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-shopee-text-secondary">Maksimal per Transaksi</span>
                      <span className="text-shopee-text font-medium">
                        {pointsConfig.maxPoints.toLocaleString("id-ID")} poin
                      </span>
                    </div>
                  )}
                  {pointsConfig.caption && (
                    <p className="text-[11px] text-shopee-orange mt-2 bg-shopee-orange-light rounded-sm px-2 py-1.5">
                      {pointsConfig.caption}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* How to earn */}
            <div className="mt-3 bg-white lg:rounded-sm p-4">
              <p className="text-xs font-medium text-shopee-text mb-3">Cara Mendapatkan Koin</p>
              <div className="space-y-3">
                {[
                  { icon: ShoppingBag, text: pointsConfig?.caption || "Dapatkan cashback dari setiap pembelian" },
                  { icon: Gift, text: "Tukarkan voucher untuk bonus koin" },
                  { icon: Coins, text: "Login harian untuk koin gratis" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-shopee-orange-light flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-shopee-orange" />
                    </div>
                    <p className="text-xs text-shopee-text">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Help */}
            <div className="mt-3 px-3 lg:px-0">
              <div className="bg-blue-50 rounded-sm p-3 flex gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Koin dihitung otomatis saat checkout berhasil dan disimpan di server. Koin dapat digunakan untuk mendapatkan diskon atau voucher saat checkout. Koin tidak dapat diuangkan.
                </p>
              </div>
            </div>
          </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}
