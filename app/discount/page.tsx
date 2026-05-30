"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Tag, Star, MapPin } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import { products, formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";

export default function DiscountPage() {
  const router = useRouter();
  const discountProducts = products
    .filter((p) => (p.discount || 0) >= 50)
    .sort((a, b) => (b.discount || 0) - (a.discount || 0));

  return (
    <>
      <Header />

      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </button>
          <span className="text-base font-medium text-shopee-text">Dengan Diskon</span>
        </div>

        {/* Banner */}
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4">
          <div className="bg-gradient-to-r from-shopee-orange to-shopee-yellow px-4 py-6 lg:rounded-sm text-white">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-6 h-6" />
              <span className="font-bold text-xl">Dengan Diskon</span>
            </div>
            <p className="text-white/90 text-sm">Produk dengan diskon 50% ke atas — Hemat s/d 75%</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4 py-3">
          <p className="text-sm text-shopee-text-secondary">
            Menampilkan <span className="text-shopee-orange font-medium">{discountProducts.length}</span> produk diskon
          </p>
        </div>

        {/* Products Grid */}
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {discountProducts.map((product) => (
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
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] text-shopee-text-secondary line-through">{formatPrice(product.originalPrice)}</p>
                      <span className="text-[10px] text-shopee-orange font-medium">-{Math.round((1 - product.price / product.originalPrice) * 100)}%</span>
                    </div>
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 bg-shopee-orange-light text-shopee-orange text-[10px] px-1.5 py-0.5 rounded-sm font-medium">
                    <Tag className="w-3 h-3" />
                    Diskon {product.discount}%
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
        </div>
      </main>

      <BottomNav />
    </>
  );
}
