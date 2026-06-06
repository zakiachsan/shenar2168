/**
 * Cart Context
 * 
 * Manages shopping cart state with localStorage persistence.
 * Uses React Context instead of Zustand to avoid WSL npm install issues.
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
  sku?: string;
  stock?: number | null;
  variationId?: number;
  variantLabel?: string;
  shopName?: string;
  weight?: number; // in grams
  height?: number; // in cm
  length?: number; // in cm
  width?: number;  // in cm
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: number, variationId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variationId?: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  isInCart: (productId: number, variationId?: number) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('shenar2168-cart');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('shenar2168-cart', JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

function getGuestSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('shenar2168-guest-session');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('shenar2168-guest-session', id);
  }
  return id;
}

function syncCartWithServer(items: CartItem[]) {
  const guestSessionId = getGuestSessionId();
  const orderId = localStorage.getItem('shenar2168-cart-order-id');
  fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, guestSessionId, orderId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.orderId) {
        localStorage.setItem('shenar2168-cart-order-id', String(data.orderId));
      }
    })
    .catch(() => {
      // Silently ignore sync errors so cart UX isn't affected
    });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; price: number; visible: boolean } | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    setItems(loadCart());
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      saveCart(items);
    }
  }, [items, isLoaded]);

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    let nextItems: CartItem[] = [];
    setItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.productId === newItem.productId &&
          item.variationId === newItem.variationId
      );
      if (existing) {
        nextItems = prev.map((item) =>
          item.productId === newItem.productId && item.variationId === newItem.variationId
            ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
            : item
        );
      } else {
        nextItems = [
          ...prev,
          {
            productId: newItem.productId,
            name: newItem.name,
            price: newItem.price,
            originalPrice: newItem.originalPrice,
            image: newItem.image,
            quantity: newItem.quantity || 1,
            sku: newItem.sku,
            stock: newItem.stock,
            variationId: newItem.variationId,
            shopName: newItem.shopName || "Shenar2168 Official",
            weight: newItem.weight,
            height: newItem.height,
            length: newItem.length,
            width: newItem.width,
          },
        ];
      }
      return nextItems;
    });
    // Show toast notification
    if (typeof window !== 'undefined' && (window as any).showCartToast) {
      (window as any).showCartToast(newItem.name, newItem.price);
    }
    // Fire-and-forget sync to WooCommerce (non-blocking)
    syncCartWithServer(nextItems);
  }, []);

  const removeItem = useCallback((productId: number, variationId?: number) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(item.productId === productId && item.variationId === variationId)
      )
    );
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, variationId?: number) => {
    if (quantity < 1) {
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(item.productId === productId && item.variationId === variationId)
        )
      );
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variationId === variationId
          ? { ...item, quantity }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getSubtotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const isInCart = useCallback((productId: number, variationId?: number) => {
    return items.some(
      (item) => item.productId === productId && item.variationId === variationId
    );
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getItemCount,
      getSubtotal,
      isInCart,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, getItemCount, getSubtotal, isInCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast?.visible && (
        <div className="fixed top-4 right-4 z-[9999] bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-sm">
          <div className="font-medium text-sm">{toast.message} ditambahkan ke keranjang!</div>
          <div className="text-xs text-white/80 mt-0.5">Rp {toast.price.toLocaleString('id-ID')}</div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
