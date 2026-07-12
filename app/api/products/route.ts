/**
 * Products API — fetches from WooCommerce via HTTPS + Basic Auth
 */
import { NextRequest, NextResponse } from 'next/server';
import { getProductImageUrl } from '@/lib/data';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';

const BASIC_AUTH = 'Basic ' + Buffer.from(CK + ':' + CS).toString('base64');

const SITE_URL = 'https://api.shenar2168.com';

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  // Rewrite relative/wp-content URLs -> https://api.shenar2168.com/wp-content/
  return url.replace(/https?:\/\/[\d.]+:\d+\/wp-content\//, `${SITE_URL}/wp-content/`);
}

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url);
    const wcUrl = new URL(`${WC_URL}/wp-json/wc/v3/products`);
    wcUrl.searchParams.set('status', 'publish');

    const params = ['page','per_page','category','search','featured','on_sale','orderby','order','min_price','max_price','include','ids'];
    for (const p of params) {
      const v = q.searchParams.get(p);
      if (v) wcUrl.searchParams.set(p === 'ids' ? 'include' : p, v);
    }

    const res = await fetch(wcUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': BASIC_AUTH,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.warn('WC API failed:', txt.substring(0, 100));
      // Fallback to static data when WC is unavailable
      const { allProducts } = await import('@/lib/data');
      const filtered = allProducts.filter((p: any) => {
        if (q.searchParams.get('search')) {
          const s = q.searchParams.get('search')!.toLowerCase();
          return p.name.toLowerCase().includes(s) || p.categories?.some((c: string) => c.includes(s));
        }
        if (q.searchParams.get('featured')) return p.badge || p.featured;
        return true;
      });
      const perPage = parseInt(q.searchParams.get('per_page') || '12');
      const page = parseInt(q.searchParams.get('page') || '1');
      const start = (page - 1) * perPage;
      const products = filtered.slice(start, start + perPage).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.image,
        rating: p.rating,
        sold: p.sold,
        location: p.location || 'Jakarta',
        discount: p.discount,
        badge: p.badge,
        badgeColor: p.badgeColor,
        categories: p.categories || [],
      }));
      return NextResponse.json({ products, total: filtered.length });
    }

    const data = await res.json();
    const products = data.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: parseInt(p.sale_price || p.price),
      originalPrice: parseInt(p.regular_price),
      image: fixImageUrl(getProductImageUrl(p.images?.[0]?.src, p.id, p.name, p.categories?.map((c: any) => c.slug), 600)) || undefined,
      rating: parseFloat(p.average_rating) || 0,
      sold: p.total_sales >= 1000 ? `${Math.floor(p.total_sales/100)/10}rb+` : (p.total_sales || 0).toString(),
      location: 'Jakarta',
      discount: p.on_sale ? Math.round((1 - parseInt(p.sale_price || p.price) / parseInt(p.regular_price)) * 100) : undefined,
      badge: p.total_sales > 100 ? 'Star+' : undefined,
      badgeColor: p.total_sales > 100 ? 'bg-yellow-400' : undefined,
      categories: p.categories.map((c: any) => c.slug),
      stock: p.stock_quantity,
      slug: p.slug,
      sku: p.sku,
      description: p.short_description || p.description,
      on_sale: p.on_sale,
      purchasable: p.purchasable,
      weight: p.weight ? parseFloat(p.weight) * 1000 : undefined, // kg -> grams
      height: p.dimensions?.height ? parseFloat(p.dimensions.height) : undefined,
      length: p.dimensions?.length ? parseFloat(p.dimensions.length) : undefined,
      width: p.dimensions?.width ? parseFloat(p.dimensions.width) : undefined,
    }));

    return NextResponse.json({ products, total: products.length });
  } catch (e) {
    console.error(e);
    // Fallback to static data when WC is unreachable
    const { allProducts } = await import('@/lib/data');
    const q = new URL(req.url);
    const filtered = allProducts.filter((p: any) => {
      if (q.searchParams.get('search')) {
        const s = q.searchParams.get('search')!.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.categories?.some((c: string) => c.includes(s));
      }
      if (q.searchParams.get('featured')) return p.badge || p.featured;
      if (q.searchParams.get('on_sale')) return (p.discount || 0) > 0;
      return true;
    });
    const perPage = parseInt(q.searchParams.get('per_page') || '12');
    const page = parseInt(q.searchParams.get('page') || '1');
    const start = (page - 1) * perPage;
    const products = filtered.slice(start, start + perPage).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.image,
      rating: p.rating,
      sold: p.sold,
      location: p.location || 'Jakarta',
      discount: p.discount,
      badge: p.badge,
      badgeColor: p.badgeColor,
      categories: p.categories || [],
    }));
    return NextResponse.json({ products, total: filtered.length });
  }
}
