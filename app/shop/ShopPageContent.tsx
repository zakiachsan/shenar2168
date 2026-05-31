"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Search,
  Star,
  Package,
  Users,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import ProductCard from "@/app/components/shared/ProductCard";

interface ShopProduct {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  discount?: number;
  badge?: string;
  badgeColor?: string;
  rating: number;
  sold: string;
  location: string;
  categories?: string[];
}

type SortOption = "populer" | "terbaru" | "termurah" | "termahal";

const sortOptions: { key: SortOption; label: string }[] = [
  { key: "populer", label: "Populer" },
  { key: "terbaru", label: "Terbaru" },
  { key: "termurah", label: "Harga Terendah" },
  { key: "termahal", label: "Harga Tertinggi" },
];

export default function ShopPageContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") || "";

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(urlCategory || "Semua");
  const [sortBy, setSortBy] = useState<SortOption>("populer");
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/products?per_page=100");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categoryTabs = useMemo(() => {
    const tabs = ["Semua"];
    const seen = new Set<string>();
    products.forEach((p) => {
      p.categories?.forEach((c) => {
        const name = c.replace(/-/g, " ");
        if (!seen.has(name)) {
          seen.add(name);
          tabs.push(name.charAt(0).toUpperCase() + name.slice(1));
        }
      });
    });
    return tabs.slice(0, 12);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (activeCategory !== "Semua") {
      const catSlug = activeCategory.toLowerCase().replace(/\s+/g, "-");
      list = list.filter((p) =>
        p.categories?.some(
          (c) => c === catSlug || c.replace(/-/g, " ") === activeCategory.toLowerCase()
        )
      );
    }

    switch (sortBy) {
      case "termurah":
        list.sort((a, b) => a.price - b.price);
        break;
      case "termahal":
        list.sort((a, b) => b.price - a.price);
        break;
      case "terbaru":
        list.sort((a, b) => b.id - a.id);
        break;
      default:
        list.sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          const parseSold = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
          return parseSold(b.sold) - parseSold(a.sold);
        });
    }

    return list;
  }, [products, search, activeCategory, sortBy]);

  const avgRating = 5;

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Shenar2168 Official</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4 space-y-3">
          {/* Shop Header */}
          <div className="bg-white lg:rounded-sm overflow-hidden">
            <div className="px-3 lg:px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-shopee-orange flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-medium text-shopee-text truncate">Shenar2168 Official Store</h1>
                  <p className="text-[11px] text-shopee-text-secondary flex items-center gap-1 mt-0.5">
                    <span className="text-shopee-green">Aktif 5 menit lalu</span>
                    <span>·</span>
                    <span>Jakarta</span>
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-wrap mt-3">
                <div className="flex items-center gap-1 text-xs text-shopee-text-secondary">
                  <Star className="w-3.5 h-3.5 text-shopee-yellow fill-shopee-yellow" />
                  <span className="text-shopee-text font-medium">{avgRating.toFixed(1)}</span>
                  <span>Penilaian</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-shopee-text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-shopee-text font-medium">1.2rb</span>
                  <span>Pengikut</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-shopee-text-secondary">
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-shopee-text font-medium">{products.length}</span>
                  <span>Produk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="bg-white lg:rounded-sm px-3 lg:px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-shopee-text-secondary" />
                <input
                  type="text"
                  placeholder="Cari di toko ini..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-shopee-border rounded-sm focus:outline-none focus:border-shopee-orange bg-shopee-gray/50"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-shopee-border rounded-sm text-sm text-shopee-text hover:border-shopee-orange transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">{sortOptions.find((s) => s.key === sortBy)?.label}</span>
                </button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-shopee-border rounded-sm shadow-lg z-50 w-44 py-1">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setSortBy(opt.key);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-shopee-gray transition-colors ${
                            sortBy === opt.key ? "text-shopee-orange font-medium" : "text-shopee-text"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
              {categoryTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCategory(tab)}
                  className={`snap-start flex-shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors border ${
                    activeCategory === tab
                      ? "bg-shopee-orange text-white border-shopee-orange"
                      : "bg-white text-shopee-text-secondary border-shopee-border hover:border-shopee-orange/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="bg-white lg:rounded-sm p-3 lg:p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-shopee-text">
                {activeCategory === "Semua" ? "Semua Produk" : activeCategory}
              </h2>
              <span className="text-xs text-shopee-text-secondary">{filteredProducts.length} produk</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white border border-shopee-border/30 rounded-sm overflow-hidden">
                    <div className="aspect-square bg-shopee-gray animate-pulse" />
                    <div className="p-2 space-y-1.5">
                      <div className="h-3 bg-shopee-gray rounded animate-pulse w-full" />
                      <div className="h-3 bg-shopee-gray rounded animate-pulse w-3/4" />
                      <div className="h-3.5 bg-shopee-gray rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 mx-auto text-shopee-text-secondary mb-3" />
                <p className="text-shopee-text-secondary text-sm">Tidak ada produk ditemukan</p>
                <p className="text-shopee-text-secondary text-xs mt-1">Coba ubah pencarian atau filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-3">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
