import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { McpConnectionPage } from '@/components/mcp/McpConnectionPage';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export const metadata: Metadata = {
  title: 'Connect AI - Jobmark',
  description: 'Connect Jobmark to Claude, ChatGPT, or Gemini.',
};

export default async function ConnectionsPage() {
  const session = await auth();
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0];
  const protocol = forwardedProtocol ?? (host?.startsWith('localhost') ? 'http' : 'https');
  const baseUrl = host
    ? `${protocol}://${host}`
    : (process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? '');
  const mcpBaseUrl = process.env.MCP_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? baseUrl;

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/settings/connections');
  }

  const connections = await prisma.mcpConnection.findMany({
    where: { userId: session.user.id, revokedAt: null },
    include: {
      oauthClient: { select: { id: true, clientId: true, clientName: true, redirectUris: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Connect AI"
        />
      }
    >
      <div className="mx-auto w-full max-w-(--container-content)">
        <McpConnectionPage
          key={connections.map(connection => connection.id).join('|')}
          baseUrl={mcpBaseUrl}
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
    </DashboardShell>
  );
}
