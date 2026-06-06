"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface BuyNowButtonProps {
  productId: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  sku?: string;
  stock?: number | null;
  quantity?: number;
  variationId?: number;
  variantLabel?: string;
  weight?: number;
  height?: number;
  length?: number;
  width?: number;
  className?: string;
}

export default function BuyNowButton({
  productId,
  name,
  price,
  originalPrice,
  image,
  sku,
  stock,
  quantity = 1,
  variationId,
  weight,
  height,
  length,
  width,
  className = "",
}: BuyNowButtonProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBuyNow = () => {
    setLoading(true);
    // Add item to cart
    addItem({
      productId,
      name,
      price,
      originalPrice,
      image,
      quantity,
      sku,
      stock,
      variationId,
      variantLabel,
      weight,
      height,
      length,
      width,
    });
    // Set this single item as selected for checkout
    const selectedKey = `${productId}-${variationId || 0}`;
    localStorage.setItem("shenar2168-checkout-selected", JSON.stringify([selectedKey]));
    // Navigate to checkout
    router.push("/checkout");
  };

  return (
    <button
      onClick={handleBuyNow}
      disabled={loading}
      className={`flex items-center justify-center gap-2 h-12 bg-shopee-orange hover:bg-[#d35400] text-white font-medium rounded-sm transition-colors disabled:opacity-70 ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      Beli Sekarang
    </button>
  );
}
