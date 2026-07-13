"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AuthUser {
  phone: string;
  name: string;
  address?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (phone: string, name?: string, address?: string) => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
  logout: () => void;
  loginOpen: boolean;
  loginTitle: string | null;
  openLogin: (title?: string) => void;
  closeLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  updateProfile: () => {},
  logout: () => {},
  loginOpen: false,
  loginTitle: null,
  openLogin: () => {},
  closeLogin: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTitle, setLoginTitle] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("shopee_clone_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  const login = (phone: string, name = "Pengguna", address?: string) => {
    let finalName = name;
    let finalAddress = address;
    try {
      const saved = localStorage.getItem("shenar2168_saved_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone === phone) {
          if (parsed.name && parsed.name !== "Pengguna") finalName = parsed.name;
          if (parsed.address) finalAddress = parsed.address;
        }
      }
    } catch {}
    const u: AuthUser = { phone, name: finalName, ...(finalAddress ? { address: finalAddress } : {}) };
    localStorage.setItem("shopee_clone_user", JSON.stringify(u));
    setUser(u);
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const u = { ...prev, ...updates };
      localStorage.setItem("shopee_clone_user", JSON.stringify(u));
      return u;
    });
  };

  const logout = () => {
    try {
      const current = localStorage.getItem("shopee_clone_user");
      if (current) {
        const parsed = JSON.parse(current);
        localStorage.setItem("shenar2168_saved_profile", JSON.stringify({
          name: parsed.name,
          address: parsed.address,
          phone: parsed.phone,
        }));
      }
    } catch {}
    localStorage.removeItem("shopee_clone_user");
    setUser(null);
  };

  const openLogin = useCallback((title?: string) => {
    setLoginTitle(title || null);
    setLoginOpen(true);
  }, []);
  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setLoginTitle(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, updateProfile, logout, loginOpen, loginTitle, openLogin, closeLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
