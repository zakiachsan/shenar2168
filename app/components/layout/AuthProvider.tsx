"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AuthUser {
  phone: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (phone: string, name?: string) => void;
  logout: () => void;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  loginOpen: false,
  openLogin: () => {},
  closeLogin: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("shopee_clone_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  const login = (phone: string, name = "Pengguna") => {
    const u: AuthUser = { phone, name };
    localStorage.setItem("shopee_clone_user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("shopee_clone_user");
    setUser(null);
  };

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loginOpen, openLogin, closeLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
