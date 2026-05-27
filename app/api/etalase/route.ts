import { NextResponse } from 'next/server';
import { getEnabledEtalase } from '@/lib/etalase';

export async function GET() {
  try {
    const sections = getEnabledEtalase();
    return NextResponse.json(sections);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
