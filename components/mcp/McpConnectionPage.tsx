'use client';

import Link from 'next/link';
import { type ComponentType, useState } from 'react';
import { Claude, Gemini, OpenAI } from '@lobehub/icons';
import { CircleHelp, ExternalLink, Link2, Loader2, PlugZap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getMcpProviderKey, getMcpProviderName } from '@/lib/mcp/provider-identity';
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
  user: { id: string; name?: string | null; email?: string | null } | null;
  initialProviderId?: string;
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
      'In Claude, open Settings, choose Connectors, then Add custom connector. Paste your Jobmark link and finish signing in.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    Icon: ChatGptIcon,
    connectUrl: 'https://chatgpt.com/',
    instructions:
      'In ChatGPT, open Settings, then Apps or Developer mode, and add a custom connector if your plan or workspace supports it.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    Icon: Gemini.Color,
    connectUrl: 'https://gemini.google.com/',
    instructions:
      'In Gemini on the web, open Settings & help, then Connected Apps. Add your Jobmark link under Custom apps for Spark and choose Next.',
  },
];

export function McpConnectionPage({
  baseUrl,
  user,
  connections,
  initialProviderId,
}: McpConnectionProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    () => providers.find(provider => provider.id === initialProviderId) ?? null
  );
  const [revoking, setRevoking] = useState<string | null>(null);
  const [connectionToRevoke, setConnectionToRevoke] = useState<string | null>(null);
  const jobmarkLink = `${baseUrl}/mcp`;
  const visibleConnections = deduplicateConnections(connections);
  const connectionBeingRevoked = visibleConnections.find(
    connection => connection.id === connectionToRevoke
  );
  const connectionBeingRevokedName = connectionBeingRevoked
    ? getMcpProviderName({
        ...connectionBeingRevoked.oauthClient,
        clientName:
          connectionBeingRevoked.oauthClient.clientName || connectionBeingRevoked.clientName,
      })
    : 'this plugin';

  const copyJobmarkLink = async () => {
    try {
      await navigator.clipboard.writeText(jobmarkLink);
      toast.success('Jobmark link copied');
    } catch {
      toast.error('Could not copy the Jobmark link');
    }
  };

  const handleRevoke = async (connectionId: string) => {
    setRevoking(connectionId);
    try {
      const response = await fetch(`/api/mcp/connections/${connectionId}/revoke`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Could not revoke Jobmark access');
      toast.success('Jobmark access revoked');
      window.location.reload();
    } catch {
      toast.error('Could not revoke Jobmark access');
    } finally {
      setRevoking(null);
      setConnectionToRevoke(null);
    }
  };

  return (
    <div className={user ? 'w-full py-2' : 'bg-background min-h-screen px-4 py-10'}>
      <div className="mx-auto max-w-5xl space-y-8">
        <section
          className={`border-border/60 bg-card/45 rounded-3xl border px-6 py-8 sm:px-10 sm:py-10 ${
            user ? '' : 'text-center'
          }`}
        >
          <div
            className={`flex flex-col gap-5 ${
              user ? 'items-start justify-between sm:flex-row sm:items-center' : 'items-center'
            }`}
          >
            <div
              className={`flex items-center gap-3 ${
                user ? 'max-w-2xl' : 'max-w-xl justify-center'
              }`}
            >
              <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                <PlugZap className="h-5 w-5" />
              </div>
              <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
                MCP Connector
              </h1>
            </div>
            <Button variant="ghost" className="shrink-0" asChild>
              <Link href="/articles/connect-jobmark-to-ai">
                <CircleHelp className="mr-2 h-4 w-4" />
                Help article
              </Link>
            </Button>
          </div>
        </section>

        {!user ? (
          <section className="mx-auto max-w-5xl text-center">
            <h2 className="text-foreground text-xl font-semibold">Choose where to use Jobmark</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Pick a plugin and add Jobmark in a couple of clicks.
            </p>
            <div className="mt-6">
              <ProviderCarousel onSelect={setSelectedProvider} />
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-4">
              <h2 className="text-foreground text-xl font-semibold">Choose an AI plugin</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose one and we’ll walk you through it.
              </p>
            </div>
            <ProviderCarousel onSelect={setSelectedProvider} />
          </section>
        )}

        {user && visibleConnections.length > 0 && (
          <Card className="border-border/60 bg-card/45 rounded-3xl">
            <CardHeader>
              <CardTitle>Your connected tools</CardTitle>
              <CardDescription>
                Revoke Jobmark access at any time. This does not remove the connector from the AI
                app.
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
                        Connected {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={revoking === connection.id}
                    aria-busy={revoking === connection.id}
                    aria-label={`Revoke ${getMcpProviderName(connection.oauthClient)} access`}
                    onClick={() => setConnectionToRevoke(connection.id)}
                  >
                    {revoking === connection.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Revoke access
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
                Jobmark link
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
                  Copy link &amp; open {selectedProvider.name}
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
            <AlertDialogTitle>Revoke {connectionBeingRevokedName} access?</AlertDialogTitle>
            <AlertDialogDescription>
              This revokes all {connectionBeingRevokedName} connections Jobmark knows about for this
              account. It stops the AI plugin from accessing your Jobmark information, but it does
              not remove the connector from the AI app. To remove it completely, delete it in the AI
              app&apos;s connector settings. You can reconnect later.
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
              Revoke access
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
