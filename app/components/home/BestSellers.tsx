"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useProducts } from "@/lib/use-products";
import ProductCard from "@/app/components/shared/ProductCard";

export default function BestSellers() {
  const { products, loading } = useProducts({ perPage: 20, orderby: "popularity", order: "desc" });

  const bestSellers = loading ? [] : products.slice(0, 8);

  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
      <div className="bg-white rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 border-b border-shopee-border/50">
          <TrendingUp className="w-5 h-5 text-shopee-orange" />
          <span className="text-shopee-orange font-bold text-base md:text-xl">Produk Terlaris</span>
        </div>

        {/* Horizontal Scroll */}
        <div className="p-2 md:p-3 overflow-x-auto scrollbar-hide">
          {loading ? (
            <div className="flex gap-2 md:gap-3 w-max px-0.5 pb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[200px] bg-shopee-gray rounded-sm animate-pulse">
                  <div className="aspect-square" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 bg-shopee-border rounded w-3/4" />
                    <div className="h-4 bg-shopee-border rounded w-1/2" />
                    <div className="h-3 bg-shopee-border rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 md:gap-3 w-max px-0.5 pb-1">
              {bestSellers.map((product, idx) => (
                <div key={product.id} className="flex-shrink-0 w-[160px] md:w-[200px]">
                  <ProductCard product={product} index={idx} />
                </div>
              ))}
              {bestSellers.length === 0 && (
                <p className="text-sm text-shopee-text-secondary py-8 px-4">Belum ada produk terlaris</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
