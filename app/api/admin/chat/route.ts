import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getAdminThreads,
  getMessages,
  sendMessage,
  markAsRead,
  updateThreadStatus,
  getThreadById,
  deleteThread,
} from '@/lib/chat';

// GET: Get admin threads or messages for a thread
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');
    const status = searchParams.get('status') as 'open' | 'closed' | null;
    const unreadOnly = searchParams.get('unreadOnly') === '1';

    // Get messages for a specific thread
    if (threadId) {
      const messages = await getMessages(Number(threadId));
      // Mark user messages as read by admin
      await markAsRead(Number(threadId), 'user');
      return NextResponse.json({ messages });
    }

    // Get threads
    const threads = await getAdminThreads({
      status: status || undefined,
      unreadOnly,
    });
    return NextResponse.json({ threads });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Admin sends a message to a thread
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { threadId, message, adminName } = body;

    if (!threadId) {
      return NextResponse.json({ error: 'threadId diperlukan' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan diperlukan' }, { status: 400 });
    }

    const thread = await getThreadById(Number(threadId));
    if (!thread) {
      return NextResponse.json({ error: 'Thread tidak ditemukan' }, { status: 404 });
    }

    const msg = await sendMessage({
      threadId: Number(threadId),
      senderType: 'admin',
      senderName: adminName || 'Admin',
      message: message.trim(),
    });

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Update thread status (close/open)
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { threadId, status } = body;

    if (!threadId) {
      return NextResponse.json({ error: 'threadId diperlukan' }, { status: 400 });
    }
    if (!status || !['open', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Status harus open atau closed' }, { status: 400 });
    }

    await updateThreadStatus(Number(threadId), status);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Delete a thread
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');
    if (!threadId) {
      return NextResponse.json({ error: 'threadId diperlukan' }, { status: 400 });
    }
    const success = await deleteThread(Number(threadId));
    if (!success) {
      return NextResponse.json({ error: 'Thread tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
