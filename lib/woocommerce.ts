/**
 * WooCommerce REST API Client
 * 
 * Handles communication between Next.js frontend and WooCommerce backend.
 * All API calls go through Next.js API routes to keep credentials server-side.
 */

export interface WCConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  wpApiPrefix?: string;
  version?: string;
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  total_sales: number;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: {
    id: number;
    name: string;
    slug: string;
  }[];
  tags: any[];
  images: {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  }[];
  attributes: {
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }[];
  default_attributes: any[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  price_html: string;
  on_sale: boolean;
  meta_data: any[];
}

export interface WCCartItem {
  product: WCProduct;
  quantity: number;
  variationId?: number;
}

export interface WCCustomerAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface WCOrder {
  id: number;
  parent_id: number;
  status: string;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: WCCustomerAddress;
  shipping: WCCustomerAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_paid: string | null;
  date_completed: string | null;
  cart_hash: string;
  number: string;
  meta_data: any[];
  line_items: {
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: any[];
    meta_data: any[];
    sku: string;
    price: number;
  }[];
  shipping_lines: {
    id: number;
    method_title: string;
    method_id: string;
    instance_id: string;
    total: string;
    total_tax: string;
    taxes: any[];
    meta_data: any[];
  }[];
  fee_lines: any[];
  coupon_lines: any[];
  refunds: any[];
  set_paid: boolean;
}

/**
 * Make API request to WooCommerce via Next.js API route
 */
export async function wcFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`/api/wc${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `WooCommerce API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Get all products with optional filters
 */
export async function getProducts(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  category?: number;
  status?: string;
  featured?: boolean;
  orderby?: string;
  order?: 'asc' | 'desc';
}): Promise<WCProduct[]> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
  }
  return wcFetch(`/products?${query.toString()}`);
}

/**
 * Get a single product by ID
 */
export async function getProduct(id: number): Promise<WCProduct> {
  return wcFetch(`/products/${id}`);
}

export interface WCVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  status: string;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: { length: string; width: string; height: string };
  shipping_class: string;
  shipping_class_id: number;
  image: {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  } | null;
  attributes: { id: number; name: string; option: string }[];
  menu_order: number;
  meta_data: any[];
}

/**
 * Get product variations
 */
export async function getProductVariations(id: number): Promise<WCVariation[]> {
  return wcFetch(`/products/${id}/variations?per_page=100`);
}

/**
 * Get all product categories
 */
export async function getCategories(params?: {
  page?: number;
  per_page?: number;
  hide_empty?: boolean;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
  }
  return wcFetch(`/products/categories?${query.toString()}`);
}

/**
 * Get a single category
 */
export async function getCategory(id: number): Promise<any> {
  return wcFetch(`/products/categories/${id}`);
}

/**
 * Create a new order
 */
export async function createOrder(order: {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: WCCustomerAddress;
  shipping: WCCustomerAddress;
  line_items: { product_id: number; quantity: number; variation_id?: number }[];
  shipping_lines?: { method_id: string; method_title: string; total: string }[];
  customer_note?: string;
  coupon_lines?: { code: string }[];
}): Promise<WCOrder> {
  return wcFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

/**
 * Get order by ID
 */
export async function getOrder(id: number): Promise<WCOrder> {
  return wcFetch(`/orders/${id}`);
}

/**
 * Get customer orders
 */
export async function getCustomerOrders(customerId: number): Promise<WCOrder[]> {
  return wcFetch(`/orders?customer=${customerId}`);
}

/**
 * Get shipping zones (for available shipping methods)
 */
export async function getShippingZones(): Promise<any[]> {
  return wcFetch('/shipping/zones');
}

/**
 * Search products
 */
export async function searchProducts(search: string, params?: {
  page?: number;
  per_page?: number;
}): Promise<WCProduct[]> {
  const query = new URLSearchParams();
  query.set('search', search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  return wcFetch(`/products?${query.toString()}`);
}
