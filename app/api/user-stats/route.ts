/**
 * User Stats API — returns user-related statistics from WooCommerce and local coin store.
 * Note: WooCommerce does not natively support coins, following, or followers.
 * Coins are managed via a local file-based store keyed by phone number.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUserCoins } from '@/lib/coins-store';

const WC_URL = process.env.WC_URL || 'https://43.157.230.126:8080';
const CK = process.env.WC_CONSUMER_KEY || 'ck_CKHQ83CpRU9Y75Q2sMSqge1Ma4J3Ozpt4wATPxq8';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_Uu641i6QalcTuvSnZ0LZbH3CJhW8IaagIbH4Hi0i';

const AUTH = Buffer.from(`${CK}:${CS}`).toString('base64');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customer_id');
    const phone = searchParams.get('phone');

    let ordersCount = 0;

    // If a customer ID is provided, try to fetch real order count from WooCommerce
    if (customerId) {
      try {
        const ordersUrl = new URL(`${WC_URL}/wp-json/wc/v3/orders`);
        ordersUrl.searchParams.set('customer', customerId);
        ordersUrl.searchParams.set('per_page', '1');
        const ordersRes = await fetch(ordersUrl.toString(), {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${AUTH}`,
          },
        });
        if (ordersRes.ok) {
          const totalHeader = ordersRes.headers.get('x-wp-total');
          ordersCount = totalHeader ? parseInt(totalHeader, 10) : 0;
        }
      } catch {
        // ignore
      }
    }

    // Get coins from local store if phone is provided
    let coins = 0;
    let transactions: any[] = [];
    if (phone) {
      const userCoins = await getUserCoins(phone);
      coins = userCoins.balance;
      transactions = userCoins.transactions;
    }

    return NextResponse.json({
      coins,
      following: 0, // WooCommerce does not have a native social following feature
      followers: 0, // WooCommerce does not have a native social followers feature
      ordersCount,
      transactions,
    });
  } catch (e) {
    console.error('User stats API error:', e);
    return NextResponse.json({ coins: 0, following: 0, followers: 0, ordersCount: 0 });
  }
}
