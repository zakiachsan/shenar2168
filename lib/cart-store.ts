/**
 * Cart Store (Zustand)
 * 
 * Manages shopping cart state with localStorage persistence.
 * Syncs with WooCommerce on checkout.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
  sku?: string;
  stock?: number | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  isInCart: (productId: number) => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (item) => item.productId === newItem.productId
          );
          
          if (existing) {
            // Update quantity if already in cart
            return {
              items: state.items.map((item) =>
                item.productId === newItem.productId
                  ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
                  : item
              ),
            };
          }

          // Add new item
          return {
            items: [
              ...state.items,
              {
                productId: newItem.productId,
                name: newItem.name,
                price: newItem.price,
                originalPrice: newItem.originalPrice,
                image: newItem.image,
                quantity: newItem.quantity || 1,
                sku: newItem.sku,
                stock: newItem.stock,
              },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      isInCart: (productId) => {
        return get().items.some((item) => item.productId === productId);
      },
    }),
    {
      name: 'shenar2168-cart', // localStorage key
    }
  )
);
