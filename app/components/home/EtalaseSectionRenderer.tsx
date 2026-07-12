"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Zap,
  ChevronRight,
  LayoutGrid,
  Tag,
  TrendingUp,
  Star,
  Heart,
  ShoppingBag,
  Percent,
  Clock,
  Sparkles,
  Gift,
  Trophy,
  Flame,
  Package,
  type LucideIcon,
} from "lucide-react";
import ProductCard from "@/app/components/shared/ProductCard";
import { formatPrice, NO_IMAGE_PLACEHOLDER, toSlug } from "@/lib/data";

interface EtalaseProductConfig {
  productId: number;
  flashSaleStock?: number;
  flashSaleSold?: number;
}

interface EtalaseSectionConfig {
  id: string;
  title: string;
  type: string;
  bannerImage?: string;
  bannerLink?: string;
  icon: string;
  isFlashSale: boolean;
  flashSaleEndTime?: string;
  products: EtalaseProductConfig[];
}

interface ProductData {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  discount?: number;
  badge?: string;
  badgeColor?: string;
  stockStatus?: string;
  rating: number;
  sold: string;
  location: string;
  categories?: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, Zap, Tag, TrendingUp, Star, Heart, ShoppingBag, Percent, Clock, Sparkles, Gift, Trophy, Flame, Package,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || LayoutGrid;
  return <Icon className={className} />;
}

function SectionBanner({
  image,
  link,
  title,
}: {
  image?: string;
  link?: string;
  title: string;
}) {
  if (!image) return null;
  const content = (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
      <div className="rounded-sm overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
  if (link) return <Link href={link} className="block">{content}</Link>;
  return content;
}

function FlashSaleCountdown({ endTime }: { endTime?: string }) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    if (!endTime) {
      setTime({ h: 0, m: 0, s: 0, expired: true });
      return;
    }
    function calc() {
      const diff = new Date(endTime!).getTime() - Date.now();
      if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return { h, m, s, expired: false };
    }
    setTime(calc());
    const timer = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (time.expired) return null;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1">
      <span className="bg-shopee-text text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.h)}</span>
      <span className="text-shopee-text font-bold text-xs">:</span>
      <span className="bg-shopee-text text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.m)}</span>
      <span className="text-shopee-text font-bold text-xs">:</span>
      <span className="bg-shopee-text text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.s)}</span>
    </div>
  );
}

function FlashSaleCard({
  product,
  config,
  index,
}: {
  product: ProductData;
  config?: EtalaseProductConfig;
  index: number;
}) {
  const soldPercent = useMemo(() => {
    if (config?.flashSaleStock && config.flashSaleStock > 0) {
      const sold = config.flashSaleSold || Math.round(config.flashSaleStock * 0.5);
      return Math.min(Math.round((sold / config.flashSaleStock) * 100), 100);
    }
    return Math.min(50 + (index * 10) % 50, 95);
  }, [config, index]);

  return (
    <Link
      href={`/product/${product.id}-${toSlug(product.name)}`}
      className="flex-shrink-0 w-[130px] sm:w-[150px] md:w-[180px] bg-white rounded-sm border border-shopee-border/50 hover:shadow-md transition-all duration-200 cursor-pointer group block"
    >
      <div className="relative aspect-square overflow-hidden bg-shopee-gray">
        <img
          src={product.image || NO_IMAGE_PLACEHOLDER}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = NO_IMAGE_PLACEHOLDER;
          }}
        />
        {product.discount && (
          <div className="absolute top-0 right-0 bg-shopee-orange/90 text-white text-[10px] font-bold px-1.5 py-0.5">
            {product.discount}% OFF
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs text-shopee-text line-clamp-2 leading-tight min-h-[2em]">{product.name}</p>
        <p className="text-shopee-orange font-medium text-sm md:text-base mt-1">{formatPrice(product.price)}</p>
        <div className="mt-2 relative">
          <div className="h-4 md:h-5 bg-[#AED6F1] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-shopee-orange to-[#5DADE2] rounded-full transition-all duration-1000"
              style={{ width: `${soldPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] md:text-[10px] text-white font-medium drop-shadow">
              TERJUAL {soldPercent}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EtalaseSectionRenderer({ section }: { section: EtalaseSectionConfig }) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  const productIds = useMemo(() => section.products.map((p) => p.productId).join(','), [section.products]);

  useEffect(() => {
    if (!productIds) {
      setLoading(false);
      return;
    }
    fetch(`/api/products?ids=${productIds}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [productIds]);

  const productConfigMap = useMemo(() => {
    const map: Record<number, EtalaseProductConfig> = {};
    section.products.forEach((p) => {
      map[p.productId] = p;
    });
    return map;
  }, [section.products]);

  const Icon = DynamicIcon;

  if (section.isFlashSale) {
    const isExpired = section.flashSaleEndTime && new Date(section.flashSaleEndTime).getTime() <= Date.now();
    if (isExpired) return null;

    return (
      <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
        <SectionBanner image={section.bannerImage} link={section.bannerLink} title={section.title} />
        <div className="bg-white rounded-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-shopee-border/50">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1">
                <Zap className="w-5 h-5 text-shopee-yellow fill-shopee-yellow" />
                <span className="text-shopee-orange font-bold text-base md:text-xl uppercase tracking-tight">
                  {section.title}
                </span>
              </div>
              <FlashSaleCountdown endTime={section.flashSaleEndTime} />
            </div>
            <Link href="/flash-sale" className="flex items-center gap-0.5 text-shopee-orange text-xs md:text-sm hover:underline">
              Lihat Semua
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-2 md:p-3 overflow-x-auto scrollbar-hide">
            {loading ? (
              <div className="flex gap-3 px-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-shrink-0 w-[130px] sm:w-[150px] md:w-[180px] bg-shopee-gray rounded-sm animate-pulse">
                    <div className="aspect-square" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-shopee-border rounded w-3/4" />
                      <div className="h-4 bg-shopee-border rounded w-1/2" />
                      <div className="h-4 bg-shopee-border rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 md:gap-3 w-max px-0.5 pb-1">
                {products.map((product, idx) => (
                  <FlashSaleCard
                    key={product.id}
                    product={product}
                    config={productConfigMap[product.id]}
                    index={idx}
                  />
                ))}
                {products.length === 0 && (
                  <p className="text-sm text-shopee-text-secondary py-8 px-4">Belum ada produk</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Non-flash-sale section
  return (
    <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
      <SectionBanner image={section.bannerImage} link={section.bannerLink} title={section.title} />
      <div className="bg-white rounded-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 border-b border-shopee-border/50">
          <Icon name={section.icon} className="w-5 h-5 text-shopee-orange" />
          <span className="text-shopee-orange font-bold text-base md:text-xl">{section.title}</span>
        </div>
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
              {products.map((product, idx) => (
                <div key={product.id} className="flex-shrink-0 w-[160px] md:w-[200px]">
                  <ProductCard product={product} index={idx} />
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-shopee-text-secondary py-8 px-4">Belum ada produk</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
