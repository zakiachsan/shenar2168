"use client";

import Link from "next/link";
import { ChevronLeft, Settings, Bell, Lock, Globe, Moon, ChevronRight } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";

const settingItems = [
  { icon: Bell, label: "Notifikasi Push", href: "#", desc: "Kelola notifikasi aplikasi" },
  { icon: Lock, label: "Keamanan Akun", href: "#", desc: "Ubah password dan verifikasi" },
  { icon: Globe, label: "Bahasa", href: "#", desc: "Bahasa Indonesia" },
  { icon: Moon, label: "Mode Gelap", href: "#", desc: "Nonaktif" },
];

export default function SettingsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Pengaturan</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center gap-2 mb-4">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Pengaturan</h1>
          </div>

          <div className="bg-white lg:rounded-sm divide-y divide-shopee-border/50">
            {settingItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-shopee-gray transition-colors"
                >
                  <div className="w-9 h-9 bg-shopee-gray rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-shopee-text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-shopee-text">{item.label}</p>
                    <p className="text-xs text-shopee-text-secondary">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-shopee-text-secondary" />
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
