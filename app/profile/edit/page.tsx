"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, User, Save, Loader2 } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import { useAuth } from "@/app/components/layout/AuthProvider";

export default function EditProfilePage() {
  const { user, login } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert("Harap isi nama dan nomor telepon.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login(phone.trim(), name.trim());
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }, 400);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Edit Profil</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center gap-2 mb-4">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Edit Profil</h1>
          </div>

          <div className="bg-white lg:rounded-sm p-4 space-y-4">
            {/* Avatar placeholder */}
            <div className="flex items-center justify-center py-4">
              <div className="w-20 h-20 rounded-full bg-shopee-orange/10 flex items-center justify-center border-2 border-shopee-orange/20">
                <User className="w-10 h-10 text-shopee-orange" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Nama Lengkap</label>
                <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
                  <span className="px-3 py-2 bg-shopee-gray text-shopee-text-secondary">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="flex-1 px-3 py-2 text-sm outline-none text-shopee-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Nomor Telepon</label>
                <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
                  <span className="px-3 py-2 bg-shopee-gray text-sm text-shopee-text border-r border-shopee-border">+62</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="812-3456-7890"
                    className="flex-1 px-3 py-2 text-sm outline-none text-shopee-text"
                  />
                </div>
              </div>

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-sm">
                  <p className="text-xs text-green-600">Profil berhasil diperbarui.</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Link
                  href="/profile"
                  className="flex-1 h-10 flex items-center justify-center border border-shopee-border text-shopee-text text-sm rounded-sm hover:bg-shopee-gray transition-colors"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-shopee-orange hover:bg-[#1A7BD4] text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
