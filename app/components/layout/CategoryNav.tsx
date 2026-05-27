"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/html";

interface WCCategory {
  id: number;
  name: string;
  slug: string;
  menu_order: number;
}

export default function CategoryNav() {
  const pathname = usePathname();
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

  const activeSlug = pathname.startsWith("/category/") ? pathname.replace("/category/", "") : "";

  if (loading) {
    return (
      <nav className="hidden lg:block bg-white border-b border-shopee-border">
        <div className="max-w-[1200px] mx-auto px-4 py-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-shopee-orange" />
        </div>
      </nav>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav className="hidden lg:block bg-white border-b border-shopee-border">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className={`whitespace-nowrap px-4 py-2.5 text-[13px] transition-colors relative ${
                activeSlug === cat.slug
                  ? "text-shopee-orange font-medium"
                  : "text-shopee-text hover:text-shopee-orange"
              }`}
            >
              {decodeHtmlEntities(cat.name)}
              {activeSlug === cat.slug && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-shopee-orange" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
