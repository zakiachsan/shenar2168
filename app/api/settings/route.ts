import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/lib/store-settings';

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json(settings);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
