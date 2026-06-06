import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: return top popular searches
export async function GET() {
  try {
    const [rows] = await db.execute(
      'SELECT query, search_count FROM search_logs ORDER BY search_count DESC, last_searched_at DESC LIMIT 8'
    );
    const searches = (rows as any[]).map((r) => ({
      query: r.query,
      count: r.search_count,
    }));
    return NextResponse.json({ searches });
  } catch (e: any) {
    return NextResponse.json({ searches: [] });
  }
}

// POST: log a search query
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || '').trim().toLowerCase();
    if (!query || query.length < 2) {
      return NextResponse.json({ ok: true });
    }

    await db.execute(
      `INSERT INTO search_logs (query, search_count, last_searched_at)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         search_count = search_count + 1,
         last_searched_at = NOW()`,
      [query]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
