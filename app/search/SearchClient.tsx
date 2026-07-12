"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import ProductCard from "@/app/components/shared/ProductCard";
import { useProducts } from "@/lib/use-products";
import { formatPrice } from "@/lib/data";

const SORT_OPTIONS = [
  { key: "relevance", label: "Relevansi" },
  { key: "newest", label: "Terbaru" },
  { key: "popular", label: "Terlaris" },
  { key: "price", label: "Harga" },
] as const;

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const searchTerm = query || category || "";
  const [sortBy, setSortBy] = useState<string>("relevance");
  const { products, loading } = useProducts({ search: searchTerm, perPage: 48 });
  const title = searchTerm || "Pencarian";

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </button>
          <span className="text-sm text-shopee-text line-clamp-1">{title}</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 py-4">
          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-shopee-text-secondary mb-4">
            <Link href="/" className="hover:text-shopee-orange">Beranda</Link>
            <span>/</span>
            <span className="text-shopee-text">Hasil Pencarian: {title}</span>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-sm p-3 mb-4 flex items-center gap-4 overflow-x-auto scrollbar-hide">
            <span className="text-sm text-shopee-text font-medium whitespace-nowrap">Urutkan:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-sm transition-colors ${
                  sortBy === opt.key
                    ? "bg-shopee-orange text-white"
                    : "text-shopee-text border border-shopee-border hover:border-shopee-orange hover:text-shopee-orange"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-shopee-text border border-shopee-border rounded-sm hover:border-shopee-orange hover:text-shopee-orange whitespace-nowrap">
              <SlidersHorizontal className="w-3 h-3" /> Filter
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-2.5">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-sm overflow-hidden animate-pulse">
                  <div className="aspect-square bg-shopee-gray" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 bg-shopee-border rounded w-3/4" />
                    <div className="h-4 bg-shopee-border rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && products.length > 0 && (
            <>
              <p className="text-sm text-shopee-text-secondary mb-3">
                Menampilkan {products.length} produk untuk &quot;{title}&quot;
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-2.5">
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      originalPrice: product.originalPrice,
                      image: product.image,
                      rating: product.rating,
                      sold: product.sold,
                      location: product.location,
                      discount: product.discount,
                      badge: product.badge,
                      badgeColor: product.badgeColor,
                      stockStatus: product.stockStatus,
                      categories: product.categories,
                    }}
                    index={idx}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div className="bg-white rounded-sm py-16 text-center">
              <p className="text-shopee-text-secondary text-sm">Tidak ada produk yang cocok dengan &quot;{title}&quot;</p>
              <Link href="/" className="inline-block mt-3 px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                Kembali ke Beranda
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
