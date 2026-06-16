/**
 * Add to Cart Button Component
 * 
 * Reusable button that adds a product to the cart.
 * Used on product cards, product detail pages, and search results.
 */

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface AddToCartButtonProps {
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
  isPreorder?: boolean;
  preorderDays?: number;
  variant?: "default" | "small" | "icon-only";
  className?: string;
}

export default function AddToCartButton({
  productId,
  name,
  price,
  originalPrice,
  image,
  sku,
  stock,
  quantity = 1,
  variationId,
  variantLabel,
  weight,
  height,
  length,
  width,
  isPreorder,
  preorderDays,
  variant = "default",
  className = "",
}: AddToCartButtonProps) {
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const alreadyInCart = isInCart(productId, variationId);

  const handleAddToCart = () => {
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
      isPreorder,
      preorderDays,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  if (variant === "icon-only") {
    return (
      <button
        onClick={handleAddToCart}
        className={`relative p-1.5 rounded-full transition-all duration-200 ${
          justAdded
            ? "bg-green-100 text-green-600"
            : "hover:bg-shopee-orange-light text-shopee-orange"
        } ${className}`}
        aria-label="Tambah ke keranjang"
      >
        {justAdded ? <Check className="w-4 h-4" /> : null}
      </button>
    );
  }

  if (variant === "small") {
    return (
      <button
        onClick={handleAddToCart}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-200 ${
          justAdded
            ? "bg-green-500 text-white"
            : "bg-shopee-orange-light text-shopee-orange hover:bg-shopee-orange hover:text-white"
        } ${className}`}
      >
        {justAdded ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Ditambahkan</span>
          </>
        ) : (
          <span>Keranjang</span>
        )}
      </button>
    );
  }

  // Default (full button)
  return (
    <button
      onClick={handleAddToCart}
      className={`flex items-center justify-center gap-2 h-12 border-2 font-medium rounded-sm transition-all duration-200 ${
        justAdded
          ? "border-green-500 bg-green-500 text-white"
          : alreadyInCart
            ? "border-shopee-orange text-shopee-orange bg-shopee-orange-light hover:bg-shopee-orange/10"
            : "border-shopee-orange text-shopee-orange bg-shopee-orange-light hover:bg-shopee-orange/10"
      } ${className}`}
    >
      {justAdded ? (
        <>
          <Check className="w-5 h-5" />
          <span>Ditambahkan ke Keranjang!</span>
        </>
      ) : (
        <span>Masukkan Keranjang</span>
      )}
    </button>
  );
}
