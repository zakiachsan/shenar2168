"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Zap, Loader2 } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
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
  enabled: boolean;
  sortOrder: number;
  bannerImage?: string;
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
  rating: number;
  sold: string;
  location: string;
}

function useCountdown(endDate: string | null) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0, expired: true });

  useEffect(() => {
    if (!endDate) {
      setTime({ h: 0, m: 0, s: 0, expired: true });
      return;
    }
    function calc() {
      const diff = new Date(endDate!).getTime() - Date.now();
      if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return { h, m, s, expired: false };
    }
    setTime(calc());
    const timer = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  return time;
}

function CountdownTimer({ endDate, className = "" }: { endDate: string | null; className?: string }) {
  const time = useCountdown(endDate);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="bg-white text-shopee-orange text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.h)}</span>
      <span className="text-white font-bold text-xs">:</span>
      <span className="bg-white text-shopee-orange text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.m)}</span>
      <span className="text-white font-bold text-xs">:</span>
      <span className="bg-white text-shopee-orange text-xs font-bold px-1.5 py-0.5 rounded-sm">{pad(time.s)}</span>
    </div>
  );
}

function FlashSaleCard({ product, config, idx }: { product: ProductData; config?: EtalaseProductConfig; idx: number }) {
  const soldPercent = useMemo(() => {
    if (config?.flashSaleStock && config.flashSaleStock > 0) {
      const sold = config.flashSaleSold || Math.round(config.flashSaleStock * 0.5);
      return Math.min(Math.round((sold / config.flashSaleStock) * 100), 100);
    }
    return Math.min(50 + (idx * 10) % 50, 95);
  }, [config, idx]);

  return (
    <Link
      href={`/product/${product.id}-${toSlug(product.name)}`}
      className="bg-white rounded-sm border border-shopee-border/50 hover:shadow-md transition-all duration-200 cursor-pointer group block overflow-hidden"
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
        <p className="text-shopee-orange font-medium text-sm mt-1">{formatPrice(product.price)}</p>
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

export default function FlashSalePage() {
  const router = useRouter();
  const [flashSection, setFlashSection] = useState<EtalaseSectionConfig | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/etalase");
        if (!res.ok) return;
        const sections: EtalaseSectionConfig[] = await res.json();
        const fs = sections.find((s) => s.isFlashSale && s.enabled);
        if (!fs) return;
        setFlashSection(fs);

        const ids = fs.products.map((p) => p.productId).join(",");
        if (!ids) return;
        const prodRes = await fetch(`/api/products?ids=${ids}`);
        if (prodRes.ok) {
          const data = await prodRes.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load flash sale:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isExpired = flashSection?.flashSaleEndTime
    ? new Date(flashSection.flashSaleEndTime).getTime() <= Date.now()
    : true;

  const productConfigMap = useMemo(() => {
    const map: Record<number, EtalaseProductConfig> = {};
    flashSection?.products.forEach((p) => { map[p.productId] = p; });
    return map;
  }, [flashSection]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
        </main>
        <BottomNav />
      </>
    );
  }

  if (isExpired || !flashSection) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8">
          <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </button>
            <span className="text-base font-medium text-shopee-text">Flash Sale</span>
          </div>
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-shopee-text-secondary">Flash Sale telah berakhir</p>
            <Link href="/" className="text-xs text-shopee-orange mt-2 inline-block hover:underline">
              Kembali ke Beranda
            </Link>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </button>
          <span className="text-base font-medium text-shopee-text">Flash Sale</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-0 lg:px-4">
          <div className="bg-gradient-to-r from-shopee-orange to-[#5DADE2] px-4 py-6 lg:rounded-sm text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-6 h-6 fill-white" />
              <span className="font-bold text-xl uppercase tracking-tight">{flashSection.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/90 text-sm">Berakhir dalam:</span>
              <CountdownTimer endDate={flashSection.flashSaleEndTime || null} />
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-3 lg:px-4 mt-3">
          {products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-shopee-text-secondary">Belum ada produk flash sale</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
              {products.map((product, idx) => (
                <FlashSaleCard key={product.id} product={product} config={productConfigMap[product.id]} idx={idx} />
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
