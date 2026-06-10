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

function getImageSrc(image: { src: string } | null): string | null {
  if (!image) return null;
  return image.src || null;
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

function softHyphenate(text: string, chunkSize: number = 7): string {
  return text
    .split(" ")
    .map((word) => {
      if (word.length <= chunkSize) return word;
      const chunks: string[] = [];
      for (let i = 0; i < word.length; i += chunkSize) {
        chunks.push(word.slice(i, i + chunkSize));
      }
      return chunks.join("\u00AD");
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
        <div className="hidden md:grid grid-cols-10 gap-0 py-4">
          {categories.map((cat, index) => {
            const imgSrc = getImageSrc(cat.image);
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="flex flex-col items-center gap-2 p-2 cursor-pointer hover:bg-shopee-orange-light/50 transition-colors rounded-sm group"
              >
                <div
                  className={`w-11 h-11 md:w-12 md:h-12 rounded-[14px] flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform ${
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
                    <span className="text-xl md:text-2xl font-bold">
                      {cat.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[11px] md:text-xs text-center text-shopee-text leading-tight line-clamp-2">
                  {softHyphenate(decodeHtmlEntities(cat.name))}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="md:hidden py-4">
          <div className="grid grid-cols-5 gap-y-4 px-2">
            {categories.slice(0, 10).map((cat, index) => {
              const imgSrc = getImageSrc(cat.image);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="flex flex-col items-center gap-1.5 cursor-pointer"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden ${
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
                  <span className="text-[10px] text-center text-shopee-text leading-tight line-clamp-2">
                    {softHyphenate(decodeHtmlEntities(cat.name))}
                  </span>
                </Link>
              );
            })}
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
