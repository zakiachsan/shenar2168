/**
 * Public Coupons API — returns full coupon data from WooCommerce
 */
import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.WC_URL || 'https://43.157.230.126:8080';
const CK = process.env.WC_CONSUMER_KEY || 'ck_CKHQ83CpRU9Y75Q2sMSqge1Ma4J3Ozpt4wATPxq8';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_Uu641i6QalcTuvSnZ0LZbH3CJhW8IaagIbH4Hi0i';

const AUTH = Buffer.from(`${CK}:${CS}`).toString('base64');

function getCouponStatus(c: any): 'active' | 'expired' | 'depleted' {
  if (c.date_expires) {
    const expires = new Date(c.date_expires);
    if (expires < new Date()) return 'expired';
  }
  if (c.usage_limit != null && c.usage_count >= c.usage_limit) {
    return 'depleted';
  }
  return 'active';
}

export async function GET(req: NextRequest) {
  try {
    const wcUrl = new URL(`${WC_URL}/wp-json/wc/v3/coupons`);
    wcUrl.searchParams.set('per_page', '100');

    const res = await fetch(wcUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${AUTH}`,
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.warn('WC Coupons API failed:', txt.substring(0, 100));
      return NextResponse.json({ count: 0, coupons: [] });
    }

    const data = await res.json();
    const coupons = Array.isArray(data)
      ? data.map((c: any) => ({
          id: c.id,
          code: c.code,
          amount: c.amount,
          discount_type: c.discount_type,
          date_expires: c.date_expires ?? null,
          minimum_amount: c.minimum_amount,
          maximum_amount: c.maximum_amount,
          usage_limit: c.usage_limit ?? null,
          usage_count: c.usage_count,
          product_ids: c.product_ids,
          product_categories: c.product_categories,
          description: c.description,
          status: getCouponStatus(c),
        }))
      : [];

    return NextResponse.json({
      count: coupons.length,
      coupons,
    });
  } catch (e) {
    console.error('Coupons API error:', e);
    return NextResponse.json({ count: 0, coupons: [] });
  }
}
