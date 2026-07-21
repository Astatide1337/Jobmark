import { McpConnectionPage } from '@/components/mcp/McpConnectionPage';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function ChatPage() {
  const session = await auth();
  
  const connections = session?.user?.id
    ? await prisma.mcpConnection.findMany({
        where: { userId: session.user.id, revokedAt: null },
        include: { oauthClient: { select: { id: true, clientName: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <McpConnectionPage
        user={session?.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : null}
        connections={connections.map(c => ({
          id: c.id,
          oauthClientId: c.oauthClientId,
          clientName: c.clientName,
          scopes: c.scopes,
          vaultUnlockedUntil: c.vaultUnlockedUntil,
          lastUsedAt: c.lastUsedAt,
          createdAt: c.createdAt,
          oauthClient: c.oauthClient,
        }))}
      />
    </div>
  );
}
