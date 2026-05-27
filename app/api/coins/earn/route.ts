import { NextRequest, NextResponse } from 'next/server';
import { earnCoins, getUserCoins } from '@/lib/coins-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amount, description, orderId } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    await earnCoins(phone, amount, description, orderId);
    const { balance } = await getUserCoins(phone);

    return NextResponse.json({ success: true, balance });
  } catch (e) {
    console.error('Coins earn API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
