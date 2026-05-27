"use client";

import { Bell, HelpCircle, Globe, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import LoginModal from "./LoginModal";
import { useAuth } from "./AuthProvider";

export default function TopBar() {
  const { user, logout, loginOpen, openLogin, closeLogin } = useAuth();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      <div className="hidden lg:block bg-[#F5F5F5] text-[#757575] text-xs">
        <div className="max-w-[1200px] mx-auto px-4 h-[30px] flex items-center justify-end gap-6">
          {!isAdmin && (
            <>
              <span className="flex items-center gap-1 hover:text-shopee-orange cursor-pointer transition-colors">
                <Bell className="w-3.5 h-3.5" />
                Notifikasi
              </span>
              <span className="flex items-center gap-1 hover:text-shopee-orange cursor-pointer transition-colors">
                <HelpCircle className="w-3.5 h-3.5" />
                Bantuan
              </span>
              <span className="flex items-center gap-1 hover:text-shopee-orange cursor-pointer transition-colors">
                <Globe className="w-3.5 h-3.5" />
                Bahasa Indonesia
              </span>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-shopee-text font-medium">
                {user.name} ({user.phone})
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1 hover:text-shopee-orange cursor-pointer transition-colors"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar
              </button>
            </div>
          ) : (
            !isAdmin && (
              <>
                <span className="hover:text-shopee-orange cursor-pointer transition-colors">
                  Daftar
                </span>
                <span className="text-shopee-border">|</span>
                <span
                  className="hover:text-shopee-orange cursor-pointer transition-colors"
                  onClick={openLogin}
                >
                  Masuk
                </span>
              </>
            )
          )}
        </div>
      </div>
      <LoginModal open={loginOpen} onClose={closeLogin} />
    </>
  );
}
