import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Customer notifications API
 *
 * Auth: customer phone is sent via X-Customer-Phone header (same localStorage as AuthProvider).
 * Since there is no server-side session for customers, we trust the header.
 *
 * Visibility rules:
 *  - user_id = <phone>  → customer's own notifications (order updates, etc.)
 *  - user_id IS NULL AND type IN ('promo','system') → global promos visible to everyone
 *  - user_id IS NULL AND type IN ('order','stock','review') → ADMIN ONLY, hidden from customers
 */

function getPhone(req: NextRequest): string | null {
  return req.headers.get('x-customer-phone') || null;
}

// GET - List notifications for a customer
export async function GET(req: NextRequest) {
  try {
    const phone = getPhone(req);
    if (!phone) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const { searchParams } = new URL(req.url);
    const limitNum = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Customer sees: their own + global promo/system
    const [rows] = await pool.execute(
      `SELECT * FROM notifications
       WHERE user_id = ?
          OR (user_id IS NULL AND type IN ('promo', 'system'))
       ORDER BY created_at DESC
       LIMIT ${limitNum}`,
      [phone]
    );

    const [unreadResult] = await pool.execute(
      `SELECT COUNT(*) as unread FROM notifications
       WHERE (user_id = ? OR (user_id IS NULL AND type IN ('promo', 'system')))
         AND is_read = 0`,
      [phone]
    );
    const unreadCount = (unreadResult as any[])[0]?.unread ?? 0;

    return NextResponse.json({ notifications: rows, unreadCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Mark as read (single or all for this customer)
export async function PUT(req: NextRequest) {
  try {
    const phone = getPhone(req);
    if (!phone) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await pool.execute(
        `UPDATE notifications SET is_read = 1
         WHERE is_read = 0
           AND (user_id = ? OR (user_id IS NULL AND type IN ('promo', 'system')))`,
        [phone]
      );
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    // Only mark if it belongs to this customer
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, phone]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
