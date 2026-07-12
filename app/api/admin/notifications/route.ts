import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import pool from '@/lib/db';

/**
 * Admin notifications API
 * Only shows admin-level notifications (user_id IS NULL).
 * Customer-specific notifications are excluded.
 */

// GET - List admin notifications
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const type = searchParams.get('type') || null;
    const unreadOnly = searchParams.get('unread') === '1';
    const offset = (page - 1) * perPage;

    // Admin only sees user_id IS NULL (admin-level notifications)
    let whereClause = 'user_id IS NULL';
    const params: any[] = [];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (unreadOnly) {
      whereClause += ' AND is_read = 0';
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`,
      params
    );
    const total = (countResult as any[])[0].total;

    // Get notifications
    const [rows] = await pool.execute(
      `SELECT * FROM notifications WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
      params
    );

    // Get unread count (admin only)
    const [unreadResult] = await pool.execute(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id IS NULL AND is_read = 0'
    );
    const unreadCount = (unreadResult as any[])[0].unread;

    return NextResponse.json({
      notifications: rows,
      total,
      page,
      perPage,
      unreadCount,
    });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Mark as read (admin only — user_id IS NULL)
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id IS NULL AND is_read = 0');
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id IS NULL', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Delete notification (admin only)
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    await pool.execute('DELETE FROM notifications WHERE id = ? AND user_id IS NULL', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
