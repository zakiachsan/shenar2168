import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getChatSettings, updateChatSettings } from '@/lib/chat-settings';

// GET: Get chat settings
export async function GET() {
  try {
    await requireAdmin();
    const settings = await getChatSettings();
    return NextResponse.json({ settings });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Update chat settings
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { greeting_message, offline_message } = body;

    const updates: Record<string, string> = {};
    if (greeting_message !== undefined) updates.greeting_message = greeting_message;
    if (offline_message !== undefined) updates.offline_message = offline_message;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada yang diupdate' }, { status: 400 });
    }

    await updateChatSettings(updates);
    const settings = await getChatSettings();
    return NextResponse.json({ settings, success: true });
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
