"use client";

import { User } from "lucide-react";
import { useAuth } from "./AuthProvider";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, openLogin } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center py-16 px-4">
          <User className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
          <p className="text-shopee-text-secondary text-sm mb-1">Silakan Masuk</p>
          <p className="text-shopee-text-secondary text-xs mb-4">Anda perlu login untuk mengakses halaman ini.</p>
          <button
            onClick={openLogin}
            className="px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4] transition-colors"
          >
            Masuk / Daftar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
