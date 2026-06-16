"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import Footer from "@/app/components/layout/Footer";
import { ChevronRight, LayoutGrid, Loader2 } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/html";

interface WCCategory {
  id: number;
  name: string;
  slug: string;
  count?: number;
  image?: string | { src: string } | null;
}

function getImageSrc(image: string | { src: string } | null | undefined): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (typeof image === "object" && "src" in image) return image.src;
  return null;
}

const FALLBACK_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-indigo-100 text-indigo-600",
  "bg-pink-100 text-pink-600",
  "bg-rose-100 text-rose-600",
  "bg-amber-100 text-amber-600",
  "bg-teal-100 text-teal-600",
  "bg-orange-100 text-orange-600",
  "bg-cyan-100 text-cyan-600",
  "bg-gray-100 text-gray-600",
];

function getFallbackColor(index: number): string {
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function CategoryListPage() {
  const [categories, setCategories] = useState<WCCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-shopee-gray">
      <Header />

      <main className="pb-20 lg:pb-0">
        {/* Page Header */}
        <div className="bg-white border-b border-shopee-border">
          <div className="max-w-[1200px] mx-auto px-4 py-4">
            <h1 className="text-lg font-medium text-shopee-text flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-shopee-orange" />
              Semua Kategori
            </h1>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-shopee-text-secondary">Belum ada kategori</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.map((cat, index) => {
                const imgSrc = getImageSrc(cat.image);
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.id}`}
                    className="bg-white rounded-sm border border-shopee-border p-4 flex flex-col items-center gap-3 hover:border-shopee-orange hover:shadow-sm transition-all group"
                  >
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform ${
                        imgSrc ? "bg-white" : `${getFallbackColor(index)}`
                      }`}
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold">
                          {cat.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-shopee-text line-clamp-1">{decodeHtmlEntities(cat.name)}</p>
                      {cat.count !== undefined && (
                        <p className="text-xs text-shopee-text-secondary mt-0.5">{cat.count} produk</p>
                      )}
                    </div>
                    <div className="flex items-center text-shopee-orange text-xs font-medium mt-1">
                      Lihat
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
