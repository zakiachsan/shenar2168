/**
 * User Stats API — returns user-related statistics from WooCommerce and local coin store.
 * Note: WooCommerce does not natively support coins, following, or followers.
 * Coins are managed via a local file-based store keyed by phone number.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUserCoins } from '@/lib/coins-store';

const WC_URL = process.env.WC_URL || 'https://api.shenar2168.com';
const CK = process.env.WC_CONSUMER_KEY || 'ck_8bd45ea98b4427b58766b0ebbe0f6d38d5a10be1';
const CS = process.env.WC_CONSUMER_SECRET || 'cs_0fd2aadf0208f9584a11ee914ed92fdf7b4a0e64';

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
