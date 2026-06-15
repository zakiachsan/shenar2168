import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateThread, sendMessage, getMessages, markAsRead, getUserThreads, findThread } from '@/lib/chat';
import { getChatSettings } from '@/lib/chat-settings';
import { checkAndSendOfflineMessage } from '@/lib/chat-offline';

// GET: Get user's threads or messages for a thread
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const threadId = searchParams.get('threadId');

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
    }

    // Get messages for a specific thread
    if (threadId) {
      const messages = await getMessages(Number(threadId));
      // Mark admin messages as read by user
      await markAsRead(Number(threadId), 'admin');
      return NextResponse.json({ messages });
    }

    // Get user's threads
    const threads = await getUserThreads(Number(userId));
    return NextResponse.json({ threads });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Send a message (creates thread if needed)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, userPhone, productId, productName, message } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId diperlukan' }, { status: 400 });
    }
    if (!userName) {
      return NextResponse.json({ error: 'userName diperlukan' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan diperlukan' }, { status: 400 });
    }

    // Check if this is a new thread
    const existingThread = await findThread(Number(userId), productId ? Number(productId) : null);
    const isNewThread = !existingThread;

    // Get or create thread
    const thread = await getOrCreateThread({
      userId: Number(userId),
      userName,
      userPhone,
      productId: productId ? Number(productId) : undefined,
      productName,
    });

    // Send user message
    const msg = await sendMessage({
      threadId: thread.id,
      senderType: 'user',
      senderName: userName,
      message: message.trim(),
    });

    // If new thread, send greeting message
    if (isNewThread) {
      try {
        const settings = await getChatSettings();
        if (settings.greeting_message) {
          await sendMessage({
            threadId: thread.id,
            senderType: 'admin',
            senderName: 'Admin',
            message: settings.greeting_message,
          });
        }
      } catch (e) {
        console.error('Failed to send greeting:', e);
      }
    } else {
      // For existing threads, check if admin is offline
      try {
        await checkAndSendOfflineMessage(thread.id);
      } catch (e) {
        console.error('Failed to check offline status:', e);
      }
    }

    return NextResponse.json({ thread, message: msg }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
