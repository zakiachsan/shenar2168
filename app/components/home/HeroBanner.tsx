"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { banners } from "@/lib/data";

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, []);

  const prev = () => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    if (!isClient) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, isClient]);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        <div className="relative aspect-[3/1] md:aspect-[3.5/1] rounded-sm overflow-hidden bg-shopee-gray">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className="absolute inset-0 transition-opacity duration-500"
              style={{ opacity: idx === current ? 1 : 0, zIndex: idx === current ? 1 : 0 }}
            >
              <img
                src={banner.image}
                alt={banner.alt}
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-[2]" />

          {/* Navigation Arrows */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm z-[3]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm z-[3]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[3]">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`transition-all rounded-full ${
                  idx === current
                    ? "w-5 h-2 bg-shopee-orange"
                    : "w-2 h-2 bg-white/70 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
