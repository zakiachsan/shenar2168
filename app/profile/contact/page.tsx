"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";

const WHATSAPP_NUMBER = "6288297206269";
const WHATSAPP_MESSAGE = "Halo Shenar2168, saya ingin bertanya tentang...";

export default function ContactPage() {
  useEffect(() => {
    // Auto-redirect to WhatsApp after a short delay so user sees the page first
    const timer = setTimeout(() => {
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
      window.location.href = url;
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Hubungi Kami</span>
        </div>

        <div className="max-w-[800px] mx-auto px-4 lg:px-4 py-0 lg:py-6">
          <div className="hidden lg:flex items-center gap-2 mb-6">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Hubungi Kami</h1>
          </div>

          <div className="mt-3 lg:mt-0 bg-white lg:rounded-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-shopee-text mb-1">Mengalihkan ke WhatsApp...</h2>
            <p className="text-xs text-shopee-text-secondary mb-6">
              Anda akan segera diarahkan ke chat WhatsApp kami. Jika tidak berpindah otomatis, klik tombol di bawah.
            </p>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat WhatsApp
            </a>

            <div className="mt-8 pt-6 border-t border-shopee-border/50 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-shopee-orange-light flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-shopee-orange" />
                </div>
                <div>
                  <p className="text-xs text-shopee-text-secondary">WhatsApp</p>
                  <p className="text-sm text-shopee-text font-medium">+62 882-9720-6269</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-shopee-orange-light flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-shopee-orange" />
                </div>
                <div>
                  <p className="text-xs text-shopee-text-secondary">Email</p>
                  <p className="text-sm text-shopee-text font-medium">support@shenar2168.id</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-shopee-orange-light flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-shopee-orange" />
                </div>
                <div>
                  <p className="text-xs text-shopee-text-secondary">Alamat</p>
                  <p className="text-sm text-shopee-text font-medium">Indonesia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
