"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Grid3X3,
  List,
  Star,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import { decodeHtmlEntities } from "@/lib/html";
import ProductCard from "@/app/components/shared/ProductCard";
import { useProducts, ProductData } from "@/lib/use-products";
import { useCart } from "@/lib/cart-context";

interface WCCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: { src: string } | null;
  count: number;
}

const defaultBanner = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=200&fit=crop";

const priceRanges = [
  { label: "Di bawah Rp50rb", min: 0, max: 50000 },
  { label: "Rp50rb - Rp100rb", min: 50000, max: 100000 },
  { label: "Rp100rb - Rp250rb", min: 100000, max: 250000 },
  { label: "Rp250rb - Rp500rb", min: 250000, max: 500000 },
  { label: "Di atas Rp500rb", min: 500000, max: Infinity },
];

const locations = ["Jakarta", "Bandung", "Surabaya", "Tangerang", "Semarang"];
const ratings = [4, 3, 2];

interface CategoryClientProps {
  slug: string;
}

export default function CategoryClient({ slug }: CategoryClientProps) {
  const safeSlug = slug || "";
  const { addItem } = useCart();

  const [category, setCategory] = useState<WCCategory | null>(null);
  const [catLoading, setCatLoading] = useState(true);

  // Fetch category info from WooCommerce
  useEffect(() => {
    async function loadCategory() {
      setCatLoading(true);
      try {
        const res = await fetch(`/api/wc/products/categories?slug=${safeSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategory(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load category:", err);
      } finally {
        setCatLoading(false);
      }
    }
    loadCategory();
  }, [safeSlug]);

  // Fetch products from WooCommerce by category
  const wcCatId = category?.id;
  const { products: wcProducts, loading: prodLoading } = useProducts({
    category: wcCatId ? String(wcCatId) : undefined,
    perPage: 48,
  });

  const [sortBy, setSortBy] = useState("populer");
  const [selectedSub, setSelectedSub] = useState("Semua");
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const loading = catLoading || prodLoading;

  const filteredProducts = useMemo(() => {
    let result = [...wcProducts];

    if (selectedPrice !== null) {
      const range = priceRanges[selectedPrice];
      result = result.filter((p) => p.price >= range.min && p.price <= range.max);
    }

    if (selectedLocation) {
      result = result.filter((p) => p.location === selectedLocation);
    }

    if (selectedRating) {
      result = result.filter((p) => p.rating >= selectedRating);
    }

    switch (sortBy) {
      case "termurah":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "termahal":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "terbaru":
        result = [...result].reverse();
        break;
      case "terlaris":
        result = [...result].sort((a, b) => Number(b.sold.replace(/[^0-9]/g, "")) - Number(a.sold.replace(/[^0-9]/g, "")));
        break;
      default:
        break;
    }

    return result;
  }, [wcProducts, selectedPrice, selectedLocation, selectedRating, sortBy]);

  const clearFilters = () => {
    setSelectedPrice(null);
    setSelectedLocation(null);
    setSelectedRating(null);
    setSelectedSub("Semua");
  };

  const activeFiltersCount = [selectedPrice, selectedLocation, selectedRating].filter(Boolean).length;

  const displayName = decodeHtmlEntities(category?.name || '') || safeSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const bannerUrl = category?.image?.src || defaultBanner;
  const productCount = filteredProducts.length;

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <h1 className="flex-1 text-base font-semibold text-shopee-text">{displayName}</h1>
        </div>

        {/* Mobile Category Info */}
        <div className="lg:hidden bg-white px-3 py-2 border-b border-shopee-border flex items-center justify-between">
          <span className="text-sm font-bold text-shopee-text">{displayName}</span>
          <span className="text-xs text-shopee-text-secondary">{productCount} Produk</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          {/* Breadcrumb Desktop */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-shopee-text-secondary mb-3 px-1">
            <Link href="/" className="hover:text-shopee-orange">Beranda</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-shopee-text">{displayName}</span>
          </div>

          {/* Banner */}
          <div className="relative h-[120px] md:h-[160px] rounded-sm overflow-hidden mb-4">
            <img src={bannerUrl} alt={displayName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center px-6">
              <div>
                <h1 className="text-white text-2xl md:text-3xl font-bold">{displayName}</h1>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white/80 mt-1" />
                ) : (
                  <p className="text-white/80 text-sm mt-1">{productCount} Produk</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Sidebar Filter Desktop */}
            <div className="hidden lg:block w-[220px] flex-shrink-0">
              <div className="bg-white rounded-sm p-4 sticky top-[120px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-sm text-shopee-text">
                    <SlidersHorizontal className="w-4 h-4 inline mr-1" />
                    Filter
                  </h3>
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-shopee-orange hover:underline">
                      Hapus ({activeFiltersCount})
                    </button>
                  )}
                </div>

                {/* Price Filter */}
                <div className="mb-5">
                  <h4 className="text-sm font-medium text-shopee-text mb-2">Rentang Harga</h4>
                  <div className="space-y-1.5">
                    {priceRanges.map((range, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative w-4 h-4">
                          <input
                            type="radio"
                            name="price"
                            checked={selectedPrice === idx}
                            onChange={() => setSelectedPrice(idx)}
                            className="w-4 h-4 accent-shopee-orange cursor-pointer"
                          />
                        </div>
                        <span className={`text-xs ${selectedPrice === idx ? "text-shopee-orange font-medium" : "text-shopee-text-secondary group-hover:text-shopee-text"}`}>
                          {range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Filter */}
                <div className="mb-5">
                  <h4 className="text-sm font-medium text-shopee-text mb-2">Lokasi</h4>
                  <div className="space-y-1.5">
                    {locations.map((loc) => (
                      <label key={loc} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="location"
                          checked={selectedLocation === loc}
                          onChange={() => setSelectedLocation(loc)}
                          className="w-4 h-4 accent-shopee-orange cursor-pointer"
                        />
                        <span className={`text-xs ${selectedLocation === loc ? "text-shopee-orange font-medium" : "text-shopee-text-secondary group-hover:text-shopee-text"}`}>
                          {loc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <h4 className="text-sm font-medium text-shopee-text mb-2">Rating</h4>
                  <div className="space-y-1.5">
                    {ratings.map((rating) => (
                      <label key={rating} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="rating"
                          checked={selectedRating === rating}
                          onChange={() => setSelectedRating(rating)}
                          className="w-4 h-4 accent-shopee-orange cursor-pointer"
                        />
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < rating ? "text-shopee-yellow fill-shopee-yellow" : "text-shopee-border"}`}
                            />
                          ))}
                          <span className="text-xs text-shopee-text-secondary ml-1">Ke atas</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Sort Bar */}
              <div className="bg-white rounded-sm p-3 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <span className="text-xs text-shopee-text-secondary whitespace-nowrap mr-1">Urutkan:</span>
                  {[
                    { id: "populer", label: "Populer" },
                    { id: "terbaru", label: "Terbaru" },
                    { id: "terlaris", label: "Terlaris" },
                    { id: "termurah", label: "Harga: Rendah ke Tinggi" },
                    { id: "termahal", label: "Harga: Tinggi ke Rendah" },
                  ].map((sort) => (
                    <button
                      key={sort.id}
                      onClick={() => setSortBy(sort.id)}
                      className={`px-3 py-1.5 text-xs rounded-sm whitespace-nowrap transition-colors ${
                        sortBy === sort.id
                          ? "bg-shopee-orange text-white"
                          : "text-shopee-text hover:text-shopee-orange"
                      }`}
                    >
                      {sort.label}
                    </button>
                  ))}
                </div>
                <div className="hidden md:flex items-center gap-1 ml-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded ${viewMode === "grid" ? "text-shopee-orange bg-shopee-orange-light" : "text-shopee-text-secondary"}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded ${viewMode === "list" ? "text-shopee-orange bg-shopee-orange-light" : "text-shopee-text-secondary"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[...Array(8)].map((_, i) => (
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

              {/* Products */}
              {!loading && filteredProducts.length > 0 && (
                <div className={`grid gap-2 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                  {filteredProducts.map((product, idx) => (
                    <div key={product.id} className="relative group">
                      <ProductCard
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
                          categories: product.categories,
                        }}
                        index={idx}
                      />
                      {/* Quick Add to Cart */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addItem({
                            productId: product.id,
                            name: product.name,
                            price: product.price,
                            originalPrice: product.originalPrice,
                            image: product.image,
                            quantity: 1,
                            weight: product.weight,
                            height: product.height,
                            length: product.length,
                            width: product.width,
                          });
                        }}
                        className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-shopee-orange hover:text-white"
                        title="Tambah ke keranjang"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredProducts.length === 0 && (
                <div className="bg-white rounded-sm py-16 text-center">
                  <p className="text-shopee-text-secondary text-sm">
                    {category ? 'Tidak ada produk yang cocok dengan filter' : 'Kategori tidak ditemukan'}
                  </p>
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} className="mt-3 px-6 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4]">
                      Reset Filter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
