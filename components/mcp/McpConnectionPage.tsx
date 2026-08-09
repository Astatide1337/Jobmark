'use client';

import Link from 'next/link';
import { type ComponentType, useState } from 'react';
import { Claude, Gemini, OpenAI, Perplexity } from '@lobehub/icons';
import {
  Check,
  CircleHelp,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  PlugZap,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
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
    oauthClient: { id: string; clientName: string };
  }>;
}

interface Provider {
  id: string;
  name: string;
  Icon: ComponentType<{ className?: string; size?: number | string }>;
  connectUrl?: string;
  instructions: string;
}

function friendlyConnectionName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'google' || normalized.includes('gemini')) return 'Gemini';
  if (normalized.includes('openai') || normalized.includes('chatgpt')) return 'ChatGPT';
  if (normalized.includes('anthropic') || normalized.includes('claude')) return 'Claude';
  return name || 'AI plugin';
}

const providers: Provider[] = [
  {
    id: 'claude',
    name: 'Claude',
    Icon: Claude.Color,
    connectUrl: 'https://claude.ai/customize/connectors',
    instructions: 'In Claude, choose Add, then Custom connector, and paste your Jobmark link.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    Icon: OpenAI,
    connectUrl: 'https://chatgpt.com/#settings/Plugins',
    instructions:
      'In ChatGPT Settings, open Plugins, turn on Developer mode, then create a plugin.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    Icon: Gemini.Color,
    connectUrl: 'https://gemini.google.com/apps',
    instructions: 'In Gemini Spark, open Custom apps, paste your Jobmark link, and choose Next.',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    Icon: Perplexity.Color,
    connectUrl: 'https://www.perplexity.ai/account/connectors',
    instructions: 'In Connectors, add a Custom remote connector and choose OAuth.',
  },
  {
    id: 'other',
    name: 'Another plugin',
    Icon: PlugZap,
    instructions: 'In your AI plugin, choose Add a connection and paste your Jobmark link.',
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
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [connectionToRevoke, setConnectionToRevoke] = useState<string | null>(null);
  const jobmarkLink = `${baseUrl}/mcp`;

  const copyJobmarkLink = async () => {
    try {
      await navigator.clipboard.writeText(jobmarkLink);
      setCopied(true);
      toast.success('Jobmark link copied');
      window.setTimeout(() => setCopied(false), 2000);
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
      if (!response.ok) throw new Error('Could not remove connection');
      toast.success('Connection removed');
      window.location.reload();
    } catch {
      toast.error('Could not remove connection');
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
            <div className={user ? 'max-w-2xl' : 'max-w-xl'}>
              <div
                className={`bg-primary/10 text-primary mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
                  user ? '' : 'mx-auto'
                }`}
              >
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

        {user && connections.length > 0 && (
          <Card className="border-border/60 bg-card/45 rounded-3xl">
            <CardHeader>
              <CardTitle>Your connected tools</CardTitle>
              <CardDescription>
                Remove a tool at any time to stop its access to Jobmark.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connections.map(connection => (
                <div
                  key={connection.id}
                  className="border-border/60 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {friendlyConnectionName(
                          connection.oauthClient.clientName || connection.clientName
                        )}
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
                    onClick={() => setConnectionToRevoke(connection.id)}
                  >
                    {revoking === connection.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remove
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
              {selectedProvider.connectUrl ? (
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
              ) : (
                <Button onClick={copyJobmarkLink}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copy Jobmark link
                </Button>
              )}
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
            <AlertDialogTitle>Remove this connection?</AlertDialogTitle>
            <AlertDialogDescription>
              The AI tool will no longer be able to use your Jobmark information. You can connect it
              again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!connectionToRevoke || revoking !== null}
              onClick={() => connectionToRevoke && handleRevoke(connectionToRevoke)}
            >
              {revoking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProviderCarousel({ onSelect }: { onSelect: (provider: Provider) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
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
    'border-border/60 bg-card/45 hover:border-primary/50 hover:bg-card flex min-h-28 w-44 shrink-0 flex-col items-start justify-between rounded-2xl border p-5 text-left transition-colors focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none';

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
