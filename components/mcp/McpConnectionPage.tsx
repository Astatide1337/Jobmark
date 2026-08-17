'use client';

import Link from 'next/link';
import { type ComponentType, useState } from 'react';
import { Claude, Gemini, OpenAI } from '@lobehub/icons';
import { CircleHelp, ExternalLink, Link2, Loader2, PlugZap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getMcpProviderKey, getMcpProviderName } from '@/lib/mcp/provider-identity';
import { copyTextToClipboard } from '@/lib/clipboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface McpConnectionProps {
  baseUrl: string;
  connections: Array<{
    id: string;
    clientName: string;
    lastUsedAt: Date | null;
    createdAt: Date;
    oauthClient: {
      id: string;
      clientId: string;
      clientName: string;
      redirectUris: string[];
    };
  }>;
}

interface Provider {
  id: string;
  name: string;
  Icon: ComponentType<{ className?: string; size?: number | string }>;
  connectUrl: string;
  instructions: string;
}

function deduplicateConnections(connections: McpConnectionProps['connections']) {
  const seenProviders = new Set<string>();
  return connections.filter(connection => {
    const providerKey = getMcpProviderKey(connection.oauthClient);
    if (seenProviders.has(providerKey)) return false;
    seenProviders.add(providerKey);
    return true;
  });
}

const providers: Provider[] = [
  {
    id: 'claude',
    name: 'Claude',
    Icon: Claude.Color,
    connectUrl: 'https://claude.ai/settings/connectors',
    instructions:
      'Open Claude’s connector settings, choose Add custom connector, paste the link, and sign in.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    Icon: ChatGptIcon,
    connectUrl: 'https://chatgpt.com/',
    instructions:
      'Open ChatGPT’s app or connector settings, add a custom connection, and paste the link. This may depend on your plan or workspace.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    Icon: Gemini.Color,
    connectUrl: 'https://gemini.google.com/',
    instructions:
      'Open Gemini’s connected apps settings, add a custom connection, and paste the link. This may depend on your account or region.',
  },
];

export function McpConnectionPage({ baseUrl, connections }: McpConnectionProps) {
  const [activeConnections, setActiveConnections] = useState(connections);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [connectionToRevoke, setConnectionToRevoke] = useState<string | null>(null);

  const jobmarkLink = `${baseUrl}/mcp`;
  const visibleConnections = deduplicateConnections(activeConnections);
  const connectionBeingRevoked = visibleConnections.find(
    connection => connection.id === connectionToRevoke
  );
  const connectionBeingRevokedName = connectionBeingRevoked
    ? getMcpProviderName({
        ...connectionBeingRevoked.oauthClient,
        clientName:
          connectionBeingRevoked.oauthClient.clientName || connectionBeingRevoked.clientName,
      })
    : 'this assistant';

  const copyJobmarkLink = async () => {
    const copied = await copyTextToClipboard(jobmarkLink);
    if (copied) toast.success('Connection link copied.');
    else toast.error('Could not copy the connection link.');
  };

  const handleRevoke = async (connectionId: string) => {
    setRevoking(connectionId);
    try {
      const response = await fetch(`/api/mcp/connections/${connectionId}/revoke`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Could not revoke Jobmark access');
      setActiveConnections(previous =>
        previous.filter(connection => connection.id !== connectionId)
      );
      toast.success('Assistant disconnected.');
    } catch {
      toast.error('Could not disconnect the assistant.');
    } finally {
      setRevoking(null);
      setConnectionToRevoke(null);
    }
  };

  return (
    <div className="w-full py-2">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="border-border/60 bg-card/45 rounded-3xl border px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex max-w-2xl items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                <PlugZap className="h-5 w-5" />
              </div>
              <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
                Connect AI
              </h1>
            </div>
            <Button variant="ghost" className="shrink-0" asChild>
              <Link href="/articles/connect-jobmark-to-ai">
                <CircleHelp className="mr-2 h-4 w-4" />
                Read the guide
              </Link>
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-foreground text-xl font-semibold">Choose an assistant</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose an assistant to see how to connect it.
            </p>
          </div>
          <ProviderCarousel onSelect={setSelectedProvider} />
        </section>

        {visibleConnections.length > 0 && (
          <Card className="border-border/60 bg-card/45 rounded-3xl">
            <CardHeader>
              <CardTitle>Connected assistants</CardTitle>
              <CardDescription>
                Disconnect an assistant here to stop it from using your Jobmark notes. You may also
                need to remove the saved connection in the assistant’s settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleConnections.map(connection => (
                <div
                  key={connection.id}
                  className="border-border/60 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                      <ConnectionProviderIcon connection={connection.oauthClient} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {getMcpProviderName({
                          ...connection.oauthClient,
                          clientName: connection.oauthClient.clientName || connection.clientName,
                        })}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Connected on {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={revoking === connection.id}
                    aria-busy={revoking === connection.id}
                    aria-label={`Disconnect ${getMcpProviderName(connection.oauthClient)}`}
                    onClick={() => setConnectionToRevoke(connection.id)}
                  >
                    {revoking === connection.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Disconnect
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={selectedProvider !== null}
        onOpenChange={open => !open && setSelectedProvider(null)}
      >
        {selectedProvider && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="bg-primary/10 text-primary mb-2 flex h-11 w-11 items-center justify-center rounded-2xl">
                <selectedProvider.Icon size={20} />
              </div>
              <DialogTitle>Connect {selectedProvider.name}</DialogTitle>
              <DialogDescription>{selectedProvider.instructions}</DialogDescription>
            </DialogHeader>
            <div className="border-border/60 bg-muted/20 rounded-2xl border p-4">
              <label htmlFor="jobmark-mcp-link" className="text-foreground text-sm font-medium">
                Jobmark connection link
              </label>
              <div className="mt-2">
                <Input
                  id="jobmark-mcp-link"
                  readOnly
                  value={jobmarkLink}
                  onFocus={event => event.currentTarget.select()}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setSelectedProvider(null)}>
                Close
              </Button>
              <Button asChild>
                <a
                  href={selectedProvider.connectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void copyJobmarkLink()}
                >
                  Copy link and open {selectedProvider.name}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <AlertDialog
        open={connectionToRevoke !== null}
        onOpenChange={open => !open && setConnectionToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {connectionBeingRevokedName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Jobmark will stop sharing your notes with {connectionBeingRevokedName}. To remove the
              connection completely, also remove Jobmark from {connectionBeingRevokedName}
              &apos;s settings. You can reconnect later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!connectionToRevoke || revoking !== null}
              aria-busy={revoking !== null}
              onClick={() => connectionToRevoke && handleRevoke(connectionToRevoke)}
            >
              {revoking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConnectionProviderIcon({
  connection,
}: {
  connection: McpConnectionProps['connections'][number]['oauthClient'];
}) {
  const providerKey = getMcpProviderKey(connection);
  if (providerKey === 'claude') return <Claude.Color size={20} />;
  if (providerKey === 'chatgpt') return <ChatGptIcon size={20} />;
  if (providerKey === 'gemini') return <Gemini.Color size={20} />;
  return <Link2 className="h-5 w-5" aria-hidden="true" />;
}

function ChatGptIcon({ className, size = 20 }: { className?: string; size?: number | string }) {
  return <OpenAI aria-hidden="true" className={`text-foreground ${className ?? ''}`} size={size} />;
}

function ProviderCarousel({ onSelect }: { onSelect: (provider: Provider) => void }) {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
      {providers.map(provider => (
        <ProviderButton key={provider.id} provider={provider} onClick={() => onSelect(provider)} />
      ))}
    </div>
  );
}

function ProviderButton({ provider, onClick }: { provider: Provider; onClick: () => void }) {
  const content = (
    <>
      <span className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
        <provider.Icon size={20} />
      </span>
      <span className="text-foreground font-medium">{provider.name}</span>
    </>
  );
  const className =
    'border-border/60 bg-card/45 hover:border-primary/50 hover:bg-card flex min-h-28 w-full flex-col items-start justify-between rounded-2xl border p-5 text-left transition-colors focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none';

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={`Connect ${provider.name}`}
    >
      {content}
    </button>
  );
}
