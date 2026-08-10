import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/chat?export=' + conversationId, request.url));
  }
  
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  
  if (!conversation || conversation.userId !== session.user.id) {
    return NextResponse.redirect(new URL('/chat?export=' + conversationId, request.url));
  }
  
  // Check if export parameter is set
  const url = new URL(request.url);
  if (url.searchParams.has('export')) {
    // Render export view
    const markdown = `# ${conversation.title || 'Untitled Conversation'}\n\n` +
      `**Created:** ${conversation.createdAt.toISOString()}\n\n` +
      `---\n\n` +
      conversation.messages.map(m => 
        `## ${m.role === 'user' ? 'You' : 'Assistant'}\n\n${m.content}\n`
      ).join('\n---\n\n');
    
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="conversation-${conversationId}.md"`,
      },
    });
  }
  
  // Redirect to chat with export parameter
  return NextResponse.redirect(new URL('/chat?export=' + conversationId, request.url));
}

export async function generateStaticParams() {
  return [];
}