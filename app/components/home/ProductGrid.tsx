"use client";

import { useProducts, ProductData } from "@/lib/use-products";
import ProductCard from "@/app/components/shared/ProductCard";

export default function ProductGrid() {
  const { products, loading, error } = useProducts({ perPage: 12 });

  return (
    <div className="max-w-[1200px] mx-auto px-4 mt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-shopee-orange font-medium text-base md:text-lg uppercase tracking-wide">
          Rekomendasi Untukmu
        </h2>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-2.5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-sm overflow-hidden animate-pulse">
              <div className="aspect-square bg-shopee-gray" />
              <div className="p-2 space-y-2">
                <div className="h-3 bg-shopee-border rounded w-3/4" />
                <div className="h-4 bg-shopee-border rounded w-1/2" />
                <div className="h-3 bg-shopee-border rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-red-500 mb-2">Gagal memuat produk dari server</p>
          <p className="text-xs text-shopee-text-secondary">Coba lagi nanti</p>
        </div>
      )}

      {/* Product Grid */}
      {!loading && (
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
      )}

      {/* Load More */}
      <div className="flex justify-center mt-6 mb-4">
        <button className="px-12 py-2.5 bg-white border border-shopee-border text-shopee-text-secondary text-sm hover:bg-shopee-gray transition-colors rounded-sm">
          Lihat Lainnya
        </button>
      </div>
    </div>
  );
}
