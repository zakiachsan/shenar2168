/**
 * Admin WooCommerce API Client
 * Uses HTTPS + Basic Auth (consumer_key/secret as username/password)
 * WC_URL must point to the WooCommerce site (e.g. https://api.shenar2168.com)
 */

import https from 'https';

const WC_BASE = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_cbbba87a85f994c1e110954ba19927a15a98fb73';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_d000173a6e2798193efafcd341e5c7cc5e58cc2e';

export interface WCResponse {
  status: number;
  data: any;
  headers?: Record<string, string | string[]>;
}

export function wcRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<WCResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${WC_BASE}/wp-json/wc/v3${endpoint}`);

    const bodyStr = body ? JSON.stringify(body) : null;

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64'),
        'Accept': 'application/json',
        ...(bodyStr
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(bodyStr).toString(),
            }
          : {}),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk: Buffer) => (responseBody += chunk.toString()));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 500,
            data: JSON.parse(responseBody),
            headers: res.headers as Record<string, string | string[]>,
          });
        } catch {
          resolve({ status: res.statusCode || 500, data: { error: responseBody }, headers: res.headers as Record<string, string | string[]> });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// --- Products ---

export async function adminGetProducts(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  category?: number;
  status?: string;
  after?: string;
  before?: string;
}): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return wcRequest('GET', `/products${qs ? '?' + qs : ''}`);
}

export async function adminGetProduct(id: number): Promise<WCResponse> {
  return wcRequest('GET', `/products/${id}`);
}

export async function adminCreateProduct(data: any): Promise<WCResponse> {
  return wcRequest('POST', '/products', data);
}

export async function adminUpdateProduct(id: number, data: any): Promise<WCResponse> {
  return wcRequest('PUT', `/products/${id}`, data);
}

export async function adminDeleteProduct(id: number): Promise<WCResponse> {
  return wcRequest('DELETE', `/products/${id}?force=true`);
}

// --- Variations ---

export async function adminGetVariations(
  productId: number,
  params?: { per_page?: number; page?: number }
): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params?.per_page) query.append('per_page', String(params.per_page));
  if (params?.page) query.append('page', String(params.page));
  const qs = query.toString();
  return wcRequest('GET', `/products/${productId}/variations${qs ? '?' + qs : ''}`);
}

export async function adminCreateVariation(productId: number, data: any): Promise<WCResponse> {
  return wcRequest('POST', `/products/${productId}/variations`, data);
}

export async function adminUpdateVariation(
  productId: number,
  variationId: number,
  data: any
): Promise<WCResponse> {
  return wcRequest('PUT', `/products/${productId}/variations/${variationId}`, data);
}

export async function adminDeleteVariation(productId: number, variationId: number): Promise<WCResponse> {
  return wcRequest('DELETE', `/products/${productId}/variations/${variationId}?force=true`);
}

export async function adminBatchVariations(
  productId: number,
  data: { create?: any[]; update?: any[]; delete?: number[] }
): Promise<WCResponse> {
  return wcRequest('POST', `/products/${productId}/variations/batch`, data);
}

// --- Orders ---

export async function adminGetOrders(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  after?: string;
  before?: string;
}): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return wcRequest('GET', `/orders${qs ? '?' + qs : ''}`);
}

export async function adminGetOrder(id: number): Promise<WCResponse> {
  return wcRequest('GET', `/orders/${id}`);
}

export async function adminCreateOrder(data: any): Promise<WCResponse> {
  return wcRequest('POST', '/orders', data);
}

export async function adminUpdateOrderStatus(
  id: number,
  status: string
): Promise<WCResponse> {
  return wcRequest('PUT', `/orders/${id}`, { status });
}

// --- Categories ---

export async function adminGetCategories(params?: {
  page?: number;
  per_page?: number;
  hide_empty?: boolean;
}): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return wcRequest('GET', `/products/categories${qs ? '?' + qs : ''}`);
}

export async function adminCreateCategory(data: any): Promise<WCResponse> {
  return wcRequest('POST', '/products/categories', data);
}

export async function adminUpdateCategory(
  id: number,
  data: any
): Promise<WCResponse> {
  return wcRequest('PUT', `/products/categories/${id}`, data);
}

export async function adminDeleteCategory(id: number): Promise<WCResponse> {
  return wcRequest('DELETE', `/products/categories/${id}?force=true`);
}

// --- Coupons ---

export async function adminGetCoupons(params?: {
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return wcRequest('GET', `/coupons${qs ? '?' + qs : ''}`);
}

export async function adminCreateCoupon(data: any): Promise<WCResponse> {
  return wcRequest('POST', '/coupons', data);
}

export async function adminDeleteCoupon(id: number): Promise<WCResponse> {
  return wcRequest('DELETE', `/coupons/${id}?force=true`);
}

// --- Customers ---

export async function adminGetCustomers(params?: {
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return wcRequest('GET', `/customers${qs ? '?' + qs : ''}`);
}

export async function adminGetCustomer(id: number): Promise<WCResponse> {
  return wcRequest('GET', `/customers/${id}`);
}

export async function adminCreateCustomer(data: any): Promise<WCResponse> {
  return wcRequest('POST', '/customers', data);
}

// --- Reviews ---

export async function adminGetReviews(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  product?: number;
}): Promise<WCResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return wcRequest('GET', `/products/reviews${qs ? '?' + qs : ''}`);
}

export async function adminCreateReview(data: any): Promise<WCResponse> {
  return wcRequest('POST', '/products/reviews', data);
}

export async function adminUpdateReview(id: number, data: any): Promise<WCResponse> {
  return wcRequest('PUT', `/products/reviews/${id}`, data);
}

export async function adminDeleteReview(id: number): Promise<WCResponse> {
  return wcRequest('DELETE', `/products/reviews/${id}?force=true`);
}

// --- Stats ---

export async function adminGetStats(range?: { from?: string; to?: string }): Promise<{
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
}> {
  try {
    const after = range?.from;
    const before = range?.to;

    const [productsRes, ordersRes, pendingRes, processingRes, completedRes] =
      await Promise.all([
        adminGetProducts({ per_page: 1, after, before }),
        adminGetOrders({ per_page: 1, after, before }),
        adminGetOrders({ status: 'pending', per_page: 1, after, before }),
        adminGetOrders({ status: 'processing', per_page: 1, after, before }),
        adminGetOrders({ status: 'completed', per_page: 1, after, before }),
      ]);

    const getTotal = (res: WCResponse): number => {
      const headerTotal = res.headers?.['x-wp-total'] || res.headers?.['X-WP-Total'];
      if (headerTotal) return parseInt(String(headerTotal), 10) || 0;
      if (Array.isArray(res.data)) return res.data.length;
      return 0;
    };

    let allOrders: any[] = [];
    let page = 1;
    const maxPages = 10;
    while (page <= maxPages) {
      const res = await adminGetOrders({ per_page: 100, page, after, before });
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length === 0) break;
      allOrders.push(...data);
      const total = getTotal(res);
      if (allOrders.length >= total) break;
      page++;
    }

    const totalRevenue = allOrders.reduce(
      (sum: number, o: any) =>
        sum + (o.status === 'completed' || o.status === 'processing' ? parseFloat(o.total || '0') : 0),
      0
    );

    return {
      totalProducts: getTotal(productsRes),
      totalOrders: getTotal(ordersRes),
      totalRevenue,
      pendingOrders: getTotal(pendingRes),
      processingOrders: getTotal(processingRes),
      completedOrders: getTotal(completedRes),
    };
  } catch (e) {
    console.error('Admin stats error:', e);
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
    };
  }
}