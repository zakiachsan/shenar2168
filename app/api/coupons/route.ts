/**
 * Public Coupons API — returns full coupon data from WooCommerce
 */
import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
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

function computeEligibility(c: any, orderTotal: number): {
  eligible: boolean;
  discount: number;
  message?: string;
  missingAmount?: number;
} {
  const status = getCouponStatus(c);
  if (status === 'expired') return { eligible: false, discount: 0, message: 'Expired' };
  if (status === 'depleted') return { eligible: false, discount: 0, message: 'Kuota habis' };

  // Check minimum amount
  const minAmount = parseFloat(c.minimum_amount || '0');
  if (minAmount > 0 && orderTotal < minAmount) {
    const gap = minAmount - orderTotal;
    return {
      eligible: false,
      discount: 0,
      missingAmount: gap,
      message: `Kurang Rp ${gap.toLocaleString('id-ID')} lagi`,
    };
  }

  // Calculate discount
  let discount = 0;
  if (c.discount_type === 'percent') {
    discount = Math.floor(orderTotal * (parseFloat(c.amount) / 100));
    const maxAmount = parseFloat(c.maximum_amount || '0');
    if (maxAmount > 0) discount = Math.min(discount, maxAmount);
  } else {
    discount = parseFloat(c.amount) || 0;
  }

  return { eligible: true, discount };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const totalParam = searchParams.get('total');

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
    const coupons: any[] = Array.isArray(data)
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

    // Single coupon validation by code
    if (code) {
      const total = parseInt(totalParam || '0');
      const found = coupons.find((c: any) => c.code.toUpperCase() === code.toUpperCase());
      if (!found) return NextResponse.json({ valid: false, discount: 0, message: 'Kupon tidak ditemukan' });
      const eligibility = computeEligibility(found, total);
      return NextResponse.json({
        valid: eligibility.eligible,
        discount: eligibility.discount,
        message: eligibility.message,
      });
    }

    // If total is provided, enrich with eligibility info
    const orderTotal = totalParam ? parseInt(totalParam) : null;
    if (orderTotal !== null) {
      const enriched = coupons.map((c: any) => ({
        ...c,
        ...computeEligibility(c, orderTotal),
      }));
      return NextResponse.json({ coupons: enriched, count: enriched.length });
    }

    return NextResponse.json({ count: coupons.length, coupons });
  } catch (e) {
    console.error('Coupons API error:', e);
    return NextResponse.json({ count: 0, coupons: [] });
  }
}
