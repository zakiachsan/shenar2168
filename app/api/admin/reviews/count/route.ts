import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { adminGetReviews, WCResponse } from '@/lib/admin-api';

export async function GET() {
  try {
    await requireAdmin();

    const statuses = ['approved', 'hold', 'spam', 'trash'];

    const [allRes, ...statusRes] = await Promise.all([
      adminGetReviews({ status: 'all', per_page: 1 }),
      ...statuses.map((s) => adminGetReviews({ status: s, per_page: 1 })),
    ]);

    const getTotal = (res: WCResponse): number => {
      const headerTotal = res.headers?.['x-wp-total'] || res.headers?.['X-WP-Total'];
      if (headerTotal) return parseInt(String(headerTotal), 10) || 0;
      if (Array.isArray(res.data)) return res.data.length;
      return 0;
    };

    const counts: Record<string, number> = {
      all: getTotal(allRes),
    };

    statuses.forEach((status, i) => {
      counts[status] = getTotal(statusRes[i]);
    });

    return NextResponse.json(counts);
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
