import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { McpConnectionPage } from '@/components/mcp/McpConnectionPage';

export const metadata: Metadata = {
  title: 'MCP Connections - Jobmark',
  description: 'Manage your Model Context Protocol connections',
};

export default async function ConnectionsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/settings/connections');
  }
  
  const connections = await prisma.mcpConnection.findMany({
    where: { userId: session.user.id, revokedAt: null },
    include: { oauthClient: { select: { id: true, clientName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-background">
      <McpConnectionPage
        user={{ id: session.user.id, name: session.user.name, email: session.user.email }}
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
