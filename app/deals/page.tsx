"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Tag, Star, MapPin } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";

interface DealProduct {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  sold: string;
  location: string;
  discount?: number;
  categories?: string[];
  slug?: string;
}

export default function DealsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<DealProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?per_page=100")
      .then((r) => r.json())
      .then((data) => {
        const all = data.products || [];
        // Show products with discount (on sale)
        const deals = all.filter((p: DealProduct) => p.discount && p.discount > 0);
        setProducts(deals);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />

      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </button>
          <span className="text-base font-medium text-shopee-text">Deals</span>
        </div>

        {/* Desktop Page Title */}
        <div className="hidden lg:block max-w-[1200px] mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-shopee-orange" />
            <h1 className="text-xl font-medium text-shopee-text">Deals</h1>
          </div>
        </div>

        {/* Deals Hero Banner */}
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4">
          <div className="bg-gradient-to-r from-shopee-orange via-[#5DADE2] to-shopee-yellow px-4 py-6 lg:rounded-sm text-white">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-5 h-5" />
              <span className="font-bold text-lg uppercase tracking-wide">Murah Meriah</span>
            </div>
            <p className="text-white/90 text-sm">Diskon s/d 75% — Gratis Ongkir & Cashback</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-sm">Gratis Ongkir</span>
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-sm">Cashback 10%</span>
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-sm">COD</span>
            </div>
          </div>
        </div>

        {/* Deals Count Bar */}
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-shopee-text-secondary">
              Menampilkan <span className="text-shopee-orange font-medium">{products.length}</span> produk diskon
            </p>
          </div>
        </div>

        {/* Deals Grid */}
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-sm border border-shopee-border/50 animate-pulse">
                  <div className="aspect-square bg-shopee-gray" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 bg-shopee-gray rounded w-3/4" />
                    <div className="h-4 bg-shopee-gray rounded w-1/2" />
                    <div className="h-3 bg-shopee-gray rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-sm py-16 text-center">
              <Tag className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
              <p className="text-shopee-text-secondary text-sm mb-1">Belum Ada Deals</p>
              <p className="text-shopee-text-secondary text-xs mb-4">Cek kembali nanti untuk promo menarik!</p>
              <Link href="/" className="inline-block px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4] transition-colors">
                Kembali Belanja
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}-${toSlug(product.name)}`}
                  className="bg-white rounded-sm border border-shopee-border/50 hover:shadow-md transition-all duration-200 cursor-pointer group block overflow-hidden"
                >
                  <div className="relative aspect-square overflow-hidden bg-shopee-gray">
                    <img
                      src={product.image || NO_IMAGE_PLACEHOLDER}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
                      }}
                    />
                    {product.discount && (
                      <div className="absolute top-0 right-0 bg-shopee-orange text-white text-[10px] font-bold px-1.5 py-0.5">
                        <span className="block leading-tight">{product.discount}%</span>
                        <span className="block leading-tight">OFF</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-xs text-shopee-text line-clamp-2 min-h-[2.4em]">{product.name}</h4>
                    <div className="mt-1">
                      <p className="text-shopee-orange font-medium text-sm">{formatPrice(product.price)}</p>
                      {product.originalPrice > product.price && (
                        <div className="flex items-center gap-1">
                          <p className="text-[11px] text-shopee-text-secondary line-through">{formatPrice(product.originalPrice)}</p>
                          <span className="text-[10px] text-shopee-orange font-medium">
                            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3 h-3 text-shopee-yellow fill-shopee-yellow" />
                      <span className="text-[10px] text-shopee-text-secondary">{product.rating}</span>
                      <span className="text-[10px] text-shopee-border">|</span>
                      <span className="text-[10px] text-shopee-text-secondary">{product.sold} terjual</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-shopee-text-secondary" />
                      <span className="text-[10px] text-shopee-text-secondary">{product.location}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4 mt-6 mb-4">
          <div className="bg-white rounded-sm border border-shopee-border/50 p-4 text-center">
            <p className="text-sm text-shopee-text-secondary">Udah liat semua deals hari ini?</p>
            <Link
              href="/"
              className="inline-block mt-2 px-6 py-2 bg-shopee-orange text-white text-sm font-medium rounded-sm hover:bg-[#1A7BD4] transition-colors"
            >
              Lihat Produk Lainnya
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </>
  );
}