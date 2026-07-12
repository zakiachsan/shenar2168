/**
 * Product Service Hook
 * 
 * Custom hook for fetching products from WooCommerce via Next.js API route.
 */

"use client";

import { useState, useEffect, useCallback } from 'react';

export interface ProductData {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  sold: string;
  location: string;
  discount?: number;
  badge?: string;
  badgeColor?: string;
  categories?: string[];
  stock?: number | null;
  stockStatus?: string;
  slug?: string;
  sku?: string;
  description?: string;
  on_sale?: boolean;
  purchasable?: boolean;
  weight?: number;
  height?: number;
  length?: number;
  width?: number;
}

interface UseProductsOptions {
  page?: number;
  perPage?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  onSale?: boolean;
  orderby?: string;
  order?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
  ids?: string;
}

interface UseProductsResult {
  products: ProductData[];
  loading: boolean;
  error: string | null;
  total: number;
  refresh: () => void;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (options.page) params.set('page', String(options.page));
      if (options.perPage) params.set('per_page', String(options.perPage));
      if (options.category) params.set('category', options.category);
      if (options.search) params.set('search', options.search);
      if (options.featured) params.set('featured', 'true');
      if (options.onSale) params.set('on_sale', 'true');
      if (options.orderby) params.set('orderby', options.orderby);
      if (options.order) params.set('order', options.order);
      if (options.minPrice) params.set('min_price', String(options.minPrice));
      if (options.maxPrice) params.set('max_price', String(options.maxPrice));
      if (options.ids) params.set('ids', options.ids);

      const response = await fetch(`/api/products?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Gagal memuat produk: ${response.status}`);
      }

      const data = await response.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [
    options.page,
    options.perPage,
    options.category,
    options.search,
    options.featured,
    options.onSale,
    options.orderby,
    options.order,
    options.minPrice,
    options.maxPrice,
    options.ids,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, total, refresh: fetchProducts };
}

/**
 * Hook to fetch a single product by ID
 */
export function useProduct(id: number | string) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/products?ids=${id}`);
        
        if (!response.ok) {
          throw new Error('Gagal memuat produk');
        }

        const data = await response.json();
        const productData = data.products?.[0] || null;
        
        if (productData) {
          setProduct(productData);
        } else {
          setProduct(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  return { product, loading, error };
}
