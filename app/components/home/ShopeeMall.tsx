"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { products, formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";

const brands = [
  { id: 1, name: "Nike", logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop" },
  { id: 2, name: "Adidas", logo: "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=100&h=100&fit=crop" },
  { id: 3, name: "Apple", logo: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=100&h=100&fit=crop" },
  { id: 4, name: "Samsung", logo: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop" },
  { id: 5, name: "Sony", logo: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=100&h=100&fit=crop" },
  { id: 6, name: "Uniqlo", logo: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=100&h=100&fit=crop" },
];

export default function Shenar2168Mall() {
  const mallProducts = products.filter((p) => p.badge === "Mall" || p.badge === "Star+").slice(0, 4);

  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
      <div className="bg-white rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-shopee-border/50">
          <div className="flex items-center gap-2">
            <span className="text-shopee-orange font-bold text-base md:text-xl uppercase tracking-wide">
              Shenar2168 Mall
            </span>
            <span className="hidden md:inline-block text-xs text-shopee-text-secondary">
              100% Ori, Gratis Ongkir & Voucher
            </span>
          </div>
          <Link href="/search?q=mall" className="flex items-center gap-0.5 text-shopee-orange text-xs md:text-sm hover:underline">
            Lihat Semua
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Brands sidebar */}
          <div className="md:w-[200px] p-3 md:border-r border-shopee-border/50">
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible scrollbar-hide">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/search?q=${encodeURIComponent(brand.name)}`}
                  className="flex items-center gap-2 p-2 rounded-sm hover:bg-shopee-gray cursor-pointer transition-colors min-w-[120px] md:min-w-0"
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-shopee-border"
                  />
                  <span className="text-xs md:text-sm text-shopee-text font-medium truncate">
                    {brand.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {mallProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}-${toSlug(product.name)}`}
                  className="bg-white border border-shopee-border/50 rounded-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group block"
                >
                  <div className="relative aspect-square bg-shopee-gray">
                    <img
                      src={product.image || NO_IMAGE_PLACEHOLDER}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
                      }}
                    />
                    {product.badge && (
                      <div className="absolute top-0 left-0 bg-shopee-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-sm">
                        {product.badge}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="text-xs text-shopee-text line-clamp-2 min-h-[2.4em]">{product.name}</h4>
                    <p className="text-shopee-orange font-medium text-sm mt-1">{formatPrice(product.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
