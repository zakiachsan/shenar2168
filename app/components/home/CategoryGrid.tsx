"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/html";

interface WCCategory {
  id: number;
  name: string;
  slug: string;
  image: { src: string } | null;
  menu_order: number;
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  elektronik: "🔌",
  handphone: "📱",
  "pakaian-pria": "👕",
  "pakaian-wanita": "👗",
  kecantikan: "💄",
  "tas-sepatu": "👟",
  "rumah-tangga": "🏠",
  mainan: "🧸",
  olahraga: "⚽",
  otomotif: "🚗",
  makanan: "🍔",
  komputer: "💻",
  kesehatan: "💊",
  buku: "📚",
  hobi: "🎨",
  perlengkapan: "🛠️",
  voucher: "🎫",
  travel: "✈️",
  fotografi: "📷",
  lainnya: "🔖",
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  elektronik: "bg-blue-100 text-blue-600",
  handphone: "bg-green-100 text-green-600",
  "pakaian-pria": "bg-indigo-100 text-indigo-600",
  "pakaian-wanita": "bg-pink-100 text-pink-600",
  kecantikan: "bg-rose-100 text-rose-600",
  "tas-sepatu": "bg-amber-100 text-amber-600",
  "rumah-tangga": "bg-teal-100 text-teal-600",
  mainan: "bg-orange-100 text-orange-600",
  olahraga: "bg-cyan-100 text-cyan-600",
  otomotif: "bg-gray-100 text-gray-600",
  makanan: "bg-red-100 text-red-600",
  komputer: "bg-slate-100 text-slate-600",
  kesehatan: "bg-emerald-100 text-emerald-600",
  buku: "bg-yellow-100 text-yellow-600",
  hobi: "bg-violet-100 text-violet-600",
  perlengkapan: "bg-stone-100 text-stone-600",
  voucher: "bg-fuchsia-100 text-fuchsia-600",
  travel: "bg-sky-100 text-sky-600",
  fotografi: "bg-lime-100 text-lime-600",
  lainnya: "bg-zinc-100 text-zinc-600",
};

function getIcon(slug: string): string {
  return CATEGORY_ICON_MAP[slug] || "🏷️";
}

function getColor(slug: string): string {
  return CATEGORY_COLOR_MAP[slug] || "bg-gray-100 text-gray-600";
}

/** Insert soft-hyphens into individual words that are too long */
function softHyphenate(text: string, chunkSize: number = 7): string {
  return text
    .split(" ")
    .map((word) => {
      if (word.length <= chunkSize) return word;
      const chunks: string[] = [];
      for (let i = 0; i < word.length; i += chunkSize) {
        chunks.push(word.slice(i, i + chunkSize));
      }
      return chunks.join("\u00AD"); // &shy;
    })
    .join(" ");
}

export default function CategoryGrid() {
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

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="bg-white rounded-sm flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-shopee-orange" />
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4">
      <div className="bg-white rounded-sm">
        {/* Desktop: 2 rows x 10 columns */}
        <div className="hidden md:grid grid-cols-10 gap-0 py-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-2 p-2 cursor-pointer hover:bg-shopee-orange-light/50 transition-colors rounded-sm group"
            >
              <div
                className={`w-11 h-11 md:w-12 md:h-12 rounded-[14px] flex items-center justify-center text-xl md:text-2xl ${getColor(cat.slug)} group-hover:scale-110 transition-transform`}
              >
                {getIcon(cat.slug)}
              </div>
              <span className="text-[11px] md:text-xs text-center text-shopee-text leading-tight line-clamp-2">
                {softHyphenate(decodeHtmlEntities(cat.name))}
              </span>
            </Link>
          ))}
        </div>

        {/* Mobile: horizontal scroll 2 rows */}
        <div className="md:hidden py-4">
          <div className="grid grid-cols-5 gap-y-4 px-2">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${getColor(cat.slug)}`}
                >
                  {getIcon(cat.slug)}
                </div>
                <span className="text-[10px] text-center text-shopee-text leading-tight line-clamp-2">
                  {softHyphenate(decodeHtmlEntities(cat.name))}
                </span>
              </Link>
            ))}
          </div>
          {categories.length > 10 && (
            <div className="flex justify-center mt-3 gap-1">
              <span className="w-5 h-1.5 rounded-full bg-shopee-orange" />
              <span className="w-1.5 h-1.5 rounded-full bg-shopee-border" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
