"use client";

import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Kebijakan Privasi</span>
        </div>

        <div className="max-w-[800px] mx-auto px-4 lg:px-4 py-0 lg:py-6">
          <div className="hidden lg:flex items-center gap-2 mb-6">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Kebijakan Privasi</h1>
          </div>

          <div className="py-4 lg:py-0 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-shopee-text">Kebijakan Privasi Shenar2168</h2>
                <p className="text-xs text-shopee-text-secondary">Terakhir diperbarui: 18 Mei 2026</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">1. Informasi yang Kami Kumpulkan</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Kami mengumpulkan informasi pribadi yang Anda berikan saat mendaftar, berbelanja, atau menghubungi kami, termasuk nama, nomor telepon, alamat pengiriman, dan riwayat pemesanan.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">2. Penggunaan Informasi</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Informasi Anda digunakan untuk memproses pesanan, mengirimkan notifikasi penting, memberikan layanan pelanggan, dan meningkatkan pengalaman berbelanja Anda di Shenar2168.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">3. Perlindungan Data</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Kami menerapkan langkah-langkah keamanan teknis dan organisasi untuk melindungi data pribadi Anda dari akses, pengungkapan, atau perubahan yang tidak sah.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">4. Berbagi Informasi</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Kami tidak menjual atau menyewakan data pribadi Anda. Informasi hanya dibagikan kepada pihak ketiga yang terpercaya seperti penyedia layanan pengiriman untuk keperluan pengiriman pesanan.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-shopee-text">5. Hak Anda</h3>
              <p className="text-xs text-shopee-text-secondary leading-relaxed">
                Anda berhak mengakses, memperbarui, atau menghapus data pribadi Anda. Hubungi kami melalui menu Hubungi Kami untuk permintaan terkait data pribadi.
              </p>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
