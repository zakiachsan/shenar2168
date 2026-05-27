"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Zap } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import { flashSaleProducts, formatPrice, NO_IMAGE_PLACEHOLDER } from "@/lib/data";

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
      <span className="bg-white text-shopee-orange text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.h)}</span>
      <span className="text-white font-bold text-xs">:</span>
      <span className="bg-white text-shopee-orange text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.m)}</span>
      <span className="text-white font-bold text-xs">:</span>
      <span className="bg-white text-shopee-orange text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.s)}</span>
    </div>
  );
}

export default function FlashSalePage() {
  const router = useRouter();
  return (
    <>
      <Header />

      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </button>
          <span className="text-base font-medium text-shopee-text">Flash Sale</span>
        </div>

        {/* Flash Sale Banner */}
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4">
          <div className="bg-gradient-to-r from-shopee-orange to-[#5DADE2] px-4 py-6 lg:rounded-sm text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-6 h-6 fill-white" />
              <span className="font-bold text-xl uppercase tracking-tight">Flash Sale</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/90 text-sm">Berakhir dalam:</span>
              <CountdownTimer />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-[1200px] mx-auto px-3 lg:px-4 mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {flashSaleProducts.map((product, idx) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
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
                    <div className="absolute top-0 right-0 bg-shopee-orange/90 text-white text-[10px] font-bold px-1.5 py-0.5">
                      {product.discount}% OFF
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-shopee-orange font-medium text-sm">{formatPrice(product.price)}</p>
                  <div className="mt-2 relative">
                    <div className="h-4 md:h-5 bg-[#AED6F1] rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-shopee-orange to-[#5DADE2] rounded-full transition-all duration-1000"
                        style={{ width: `${(idx % 5 + 1) * 20}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] md:text-[10px] text-white font-medium drop-shadow">
                        TERJUAL {(idx % 5 + 1) * 20}%
                      </span>
                    </div>
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
