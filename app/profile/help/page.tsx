"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, HelpCircle, Search, ChevronDown } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";

const faqs = [
  { q: "Bagaimana cara melacak pesanan?", a: "Kamu bisa melacak pesanan melalui halaman Pesanan Saya. Klik pesanan yang ingin dilacak, lalu pilih tombol Lacak Pengiriman." },
  { q: "Bagaimana cara mengajukan pengembalian barang?", a: "Pengajuan pengembalian dapat dilakukan dalam waktu 7 hari setelah barang diterima. Buka halaman Pesanan Saya > pilih pesanan > klik Ajukan Pengembalian." },
  { q: "Metode pembayaran apa saja yang tersedia?", a: "Kami menerima pembayaran via Midtrans (Kartu Kredit/Debit, Virtual Account), OVO, DANA, dan COD (Bayar di Tempat)." },
  { q: "Berapa lama estimasi pengiriman?", a: "Estimasi pengiriman bervariasi tergantung kurir dan lokasi tujuan, biasanya 2-5 hari kerja." },
  { q: "Bagaimana cara mengubah alamat pengiriman?", a: "Alamat pengiriman dapat diubah melalui menu Profil > Alamat Pengiriman. Pastikan alamat diperbarui sebelum checkout." },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState("");

  const filtered = faqs.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Pusat Bantuan</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center gap-2 mb-4">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Pusat Bantuan</h1>
          </div>

          {/* Search */}
          <div className="bg-white lg:rounded-sm p-3 mb-3">
            <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
              <Search className="w-4 h-4 text-shopee-text-secondary ml-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pertanyaan..."
                className="flex-1 px-3 py-2 text-sm outline-none text-shopee-text"
              />
            </div>
          </div>

          {/* FAQ List */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-white lg:rounded-sm p-8 text-center">
                <HelpCircle className="w-10 h-10 text-shopee-border mx-auto mb-2" />
                <p className="text-sm text-shopee-text-secondary">Tidak ada hasil untuk pencarian ini.</p>
              </div>
            ) : (
              filtered.map((faq, idx) => (
                <div key={idx} className="bg-white lg:rounded-sm overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-shopee-gray transition-colors"
                  >
                    <span className="text-sm text-shopee-text font-medium">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-shopee-text-secondary transition-transform ${openIndex === idx ? "rotate-180" : ""}`} />
                  </button>
                  {openIndex === idx && (
                    <div className="px-4 pb-3">
                      <p className="text-sm text-shopee-text-secondary">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
