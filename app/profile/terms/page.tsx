"use client";

import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Syarat & Ketentuan</span>
        </div>

        <div className="max-w-[800px] mx-auto px-4 lg:px-4 py-0 lg:py-6">
          <div className="hidden lg:flex items-center gap-2 mb-6">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Syarat & Ketentuan</h1>
          </div>

          <div className="py-4 lg:py-0 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-shopee-text">Syarat & Ketentuan Shenar2168</h2>
                <p className="text-xs text-shopee-text-secondary">Terakhir diperbarui: 18 Mei 2026</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">1. Ketentuan Umum</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Dengan mengakses dan menggunakan platform Shenar2168, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Jika Anda tidak setuju, harap tidak menggunakan layanan kami.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">2. Akun Pengguna</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Anda bertanggung jawab atas kerahasiaan akun dan password Anda. Segala aktivitas yang dilakukan melalui akun Anda menjadi tanggung jawab Anda sepenuhnya.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">3. Pemesanan & Pembayaran</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Semua pemesanan tunduk pada ketersediaan stok. Harga yang tertera dapat berubah sewaktu-waktu. Pembayaran harus dilunasi sebelum pesanan diproses kecuali untuk metode COD (Cash on Delivery).
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">4. Pengiriman</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Waktu pengiriman merupakan estimasi dan dapat berubah tergantung lokasi serta kondisi logistik. Shenar2168 tidak bertanggung jawab atas keterlambatan yang disebabkan oleh force majeure.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">5. Pengembalian & Refund</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Pengembalian produk dapat dilakukan dalam waktu 7 hari sejak diterima dengan syarat produk dalam kondisi asli dan belum digunakan. Biaya pengiriman pengembalian ditanggung pembeli kecuali produk cacat.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">6. Perubahan Ketentuan</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Shenar2168 berhak mengubah syarat dan ketentuan ini kapan saja. Perubahan akan efektif segera setelah dipublikasikan di halaman ini.
              </p>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
