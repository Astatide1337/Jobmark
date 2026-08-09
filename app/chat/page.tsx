import { McpConnectionPage } from '@/components/mcp/McpConnectionPage';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

interface ChatPageProps {
  searchParams: Promise<{ connect?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { connect } = await searchParams;
  const session = await auth();
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0];
  const protocol = forwardedProtocol ?? (host?.startsWith('localhost') ? 'http' : 'https');
  const baseUrl = host
    ? `${protocol}://${host}`
    : (process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? '');
  const mcpBaseUrl = process.env.MCP_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? baseUrl;

  const connections = session?.user?.id
    ? await prisma.mcpConnection.findMany({
        where: { userId: session.user.id, revokedAt: null },
        include: { oauthClient: { select: { id: true, clientName: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const connectionPage = (
    <McpConnectionPage
      baseUrl={mcpBaseUrl}
      user={
        session?.user
          ? { id: session.user.id, name: session.user.name, email: session.user.email }
          : null
      }
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
      initialProviderId={connect}
    />
  );

  if (!session?.user?.id) return connectionPage;

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="MCP Connector"
        />
      }
    >
      <div className="mx-auto w-full max-w-(--container-content)">{connectionPage}</div>
    </DashboardShell>
  );
}
