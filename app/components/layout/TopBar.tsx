"use client";

import { Bell, HelpCircle, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import LoginModal from "./LoginModal";
import { useAuth } from "./AuthProvider";

export default function TopBar() {
  const { user, logout, loginOpen, loginTitle, openLogin, closeLogin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      <div className="hidden lg:block bg-[#F5F5F5] text-[#757575] text-xs">
        <div className="max-w-[1200px] mx-auto px-4 h-[30px] flex items-center justify-end gap-6">
          {!isAdmin && (
            <>
              <span
                onClick={() => router.push("/profile/notifications")}
                className="flex items-center gap-1 hover:text-shopee-orange cursor-pointer transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                Notifikasi
              </span>
              <span
                onClick={() => router.push("/profile/contact")}
                className="flex items-center gap-1 hover:text-shopee-orange cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Bantuan
              </span>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/profile'}
                className="text-shopee-text font-medium hover:text-shopee-orange transition-colors cursor-pointer"
              >
                {user.name} ({user.phone})
              </button>
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
                <span
                  onClick={() => openLogin("Daftar dengan Nomor")}
                  className="hover:text-shopee-orange cursor-pointer transition-colors"
                >
                  Daftar
                </span>
                <span className="text-shopee-border">|</span>
                <span
                  onClick={() => openLogin()}
                  className="hover:text-shopee-orange cursor-pointer transition-colors"
                >
                  Masuk
                </span>
              </>
            )
          )}
        </div>
      </div>
      <LoginModal open={loginOpen} onClose={closeLogin} title={loginTitle || undefined} />
    </>
  );
}
