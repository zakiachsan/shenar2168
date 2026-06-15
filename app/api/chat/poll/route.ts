import { NextRequest, NextResponse } from 'next/server';
import { getMessages } from '@/lib/chat';

// GET: Poll for new messages (check if admin has replied since last check)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('threadId');
    const lastMessageId = searchParams.get('lastMessageId');

    if (!threadId) {
      return NextResponse.json({ error: 'threadId diperlukan' }, { status: 400 });
    }

    const messages = await getMessages(Number(threadId));
    
    // Filter messages newer than lastMessageId
    if (lastMessageId) {
      const newMessages = messages.filter((m) => m.id > Number(lastMessageId));
      return NextResponse.json({ messages: newMessages, hasNew: newMessages.length > 0 });
    }

    return NextResponse.json({ messages, hasNew: messages.length > 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
