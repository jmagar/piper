import { NextRequest, NextResponse } from 'next/server';
import { getMessagesFromDb } from '@/lib/chat-store/messages/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const resolvedParams = await params;
    const chatId = resolvedParams.chatId;

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    // getMessagesFromDb is already marked server-only via its own file
    const messages = await getMessagesFromDb(chatId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
