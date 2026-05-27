"use client";

import { Suspense } from "react";
import ShopPageContent from "./ShopPageContent";

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-shopee-gray min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-shopee-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ShopPageContent />
    </Suspense>
  );
}
