import 'server-only';
import { prisma } from '@/lib/db';
import { getMcpProviderKey } from './provider-identity';

export async function revokeMcpConnectionForUser(
  connectionId: string,
  userId: string
): Promise<boolean> {
  const selected = await prisma.mcpConnection.findFirst({
    where: { id: connectionId, userId, revokedAt: null },
    include: {
      oauthClient: { select: { clientId: true, clientName: true, redirectUris: true } },
    },
  });
  if (!selected) return false;

  const activeConnections = await prisma.mcpConnection.findMany({
    where: { userId, revokedAt: null },
    include: {
      oauthClient: { select: { clientId: true, clientName: true, redirectUris: true } },
    },
  });
  const providerKey = getMcpProviderKey({
    clientId: selected.oauthClient.clientId,
    clientName: selected.oauthClient.clientName,
    redirectUris: selected.oauthClient.redirectUris,
  });
  const matches = activeConnections.filter(
    connection =>
      getMcpProviderKey({
        clientId: connection.oauthClient.clientId,
        clientName: connection.oauthClient.clientName,
        redirectUris: connection.oauthClient.redirectUris,
      }) === providerKey
  );
  const connectionIds = matches.map(connection => connection.id);
  const clientIds = [...new Set(matches.map(connection => connection.oauthClient.clientId))];
  const revokedAt = new Date();

  await prisma.$transaction([
    prisma.mcpConnection.updateMany({
      where: { id: { in: connectionIds }, userId, revokedAt: null },
      data: { revokedAt, vaultUnlockedUntil: null },
    }),
    prisma.oAuthAccessToken.updateMany({
      where: { userId, clientId: { in: clientIds }, revokedAt: null },
      data: { revokedAt },
    }),
    prisma.oAuthRefreshToken.updateMany({
      where: { userId, clientId: { in: clientIds }, consumedAt: null },
      data: { consumedAt: revokedAt },
    }),
    prisma.oAuthAuthorizationCode.deleteMany({
      where: { userId, clientId: { in: clientIds } },
    }),
    prisma.oAuthConsent.deleteMany({ where: { userId, clientId: { in: clientIds } } }),
    prisma.mcpIdempotency.deleteMany({ where: { connectionId: { in: connectionIds } } }),
  ]);

  return true;
}
