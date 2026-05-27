"use client";

import { useState, useEffect } from "react";
import EtalaseSectionRenderer from "./EtalaseSectionRenderer";

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
  bannerLink?: string;
  icon: string;
  isFlashSale: boolean;
  flashSaleEndTime?: string;
  products: EtalaseProductConfig[];
}

export default function HomeShowcase() {
  const [sections, setSections] = useState<EtalaseSectionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEtalase() {
      try {
        const res = await fetch("/api/etalase");
        if (res.ok) {
          const data = await res.json();
          setSections(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load etalase:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEtalase();
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-2 md:px-4 mt-3 md:mt-4">
        <div className="bg-white rounded-sm p-8 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((section) => (
        <EtalaseSectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
