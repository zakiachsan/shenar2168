"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";
import { useProducts, ProductData } from "@/lib/use-products";
import type { Product } from "@/lib/data";

function CountdownTimer() {
  const [time, setTime] = useState({ h: 2, m: 15, s: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1">
      <span className="bg-shopee-text text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.h)}</span>
      <span className="text-shopee-text font-bold text-xs">:</span>
      <span className="bg-shopee-text text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.m)}</span>
      <span className="text-shopee-text font-bold text-xs">:</span>
      <span className="bg-shopee-text text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.s)}</span>
    </div>
  );
}

function FlashSaleCard({ product, index }: { product: ProductData; index: number }) {
  const soldPercent = Math.min(50 + (index * 10) % 50, 95);

  return (
    <Link
      href={`/product/${product.id}-${toSlug(product.name)}`}
      className="flex-shrink-0 w-[130px] sm:w-[150px] md:w-[180px] bg-white rounded-sm border border-shopee-border/50 hover:shadow-md transition-all duration-200 cursor-pointer group block"
    >
      {/* Image */}
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
          <div className="absolute top-0 right-0 bg-shopee-orange/90 text-white text-[10px] font-bold px-1.5 py-0.5">
            {product.discount}% OFF
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        <p className="text-xs text-shopee-text line-clamp-2 leading-tight min-h-[2em]">{product.name}</p>
        <p className="text-shopee-orange font-medium text-sm md:text-base mt-1">
          {formatPrice(product.price)}
        </p>

        {/* Progress bar */}
        <div className="mt-2 relative">
          <div className="h-4 md:h-5 bg-[#AED6F1] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-shopee-orange to-[#5DADE2] rounded-full transition-all duration-1000"
              style={{ width: `${soldPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] md:text-[10px] text-white font-medium drop-shadow">
              TERJUAL {soldPercent}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FlashSale() {
  const { products, loading } = useProducts({ featured: true, perPage: 8, orderby: 'popularity' });

  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
      <div className="bg-white rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-shopee-border/50">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1">
              <Zap className="w-5 h-5 text-shopee-yellow fill-shopee-yellow" />
              <span className="text-shopee-orange font-bold text-base md:text-xl uppercase tracking-tight">
                Flash Sale
              </span>
            </div>
            <CountdownTimer />
          </div>
          <Link href="/flash-sale" className="flex items-center gap-0.5 text-shopee-orange text-xs md:text-sm hover:underline">
            Lihat Semua
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Horizontal Scroll Products */}
        <div className="p-2 md:p-3 overflow-x-auto scrollbar-hide -mx-0">
          {loading ? (
            <div className="flex gap-3 px-0.5">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex-shrink-0 w-[130px] sm:w-[150px] md:w-[180px] bg-shopee-gray rounded-sm animate-pulse">
                  <div className="aspect-square" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 bg-shopee-border rounded w-3/4" />
                    <div className="h-4 bg-shopee-border rounded w-1/2" />
                    <div className="h-4 bg-shopee-border rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 md:gap-3 w-max px-0.5 pb-1">
              {products.map((product, idx) => (
                <FlashSaleCard key={product.id} product={product} index={idx} />
              ))}
              {products.length === 0 && (
                <p className="text-sm text-shopee-text-secondary py-8 px-4">Belum ada produk flash sale</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
