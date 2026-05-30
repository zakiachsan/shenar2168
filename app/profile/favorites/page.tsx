"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";
import { NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";
import { getFavorites, removeFavorite, FavoriteItem } from "@/lib/favorites";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFavorites(getFavorites());

    const handler = () => setFavorites(getFavorites());
    window.addEventListener("favorites-changed", handler);
    return () => window.removeEventListener("favorites-changed", handler);
  }, []);

  const handleRemove = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavorite(id);
    setFavorites(getFavorites());
  };

  if (!mounted) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen" />
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Favorit Saya</span>
        </div>

        <AuthGuard>
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center gap-2 mb-4">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Favorit Saya</h1>
          </div>

          {favorites.length === 0 ? (
            <div className="bg-white rounded-sm py-16 text-center">
              <Heart className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
              <p className="text-shopee-text-secondary text-sm mb-1">Belum Ada Produk Favorit</p>
              <p className="text-shopee-text-secondary text-xs mb-4">Tambahkan produk favoritmu dengan menekan ikon hati.</p>
              <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                Mulai Belanja
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {favorites.map((item) => (
                <div key={item.id} className="relative group">
                  <Link href={`/product/${item.id}-${toSlug(item.name)}`} className="block bg-white lg:rounded-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-shopee-gray relative">
                      <img src={item.image || NO_IMAGE_PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-2">
                      <p className="text-sm text-shopee-text line-clamp-2">{item.name}</p>
                      <p className="text-sm text-shopee-orange font-medium mt-1">Rp {item.price.toLocaleString("id-ID")}</p>
                    </div>
                  </Link>
                  {/* Like button */}
                  <button
                    onClick={(e) => handleRemove(e, item.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors z-10"
                    aria-label="Hapus dari favorit"
                  >
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </AuthGuard>
      </main>
      <BottomNav />
    </>
  );
}
