'use client';

import Link from 'next/link';
import { Claude, Gemini, OpenAI } from '@lobehub/icons';
import { ArrowRight, ChevronDown, Link2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ConnectedMcpProvider {
  key: string;
  name: string;
}

export const MCP_PROVIDER_URLS: Record<string, string> = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
};

// These are the only provider URL handoffs we can verify against the current
// web apps. Gemini currently ignores query parameters, so it uses the
// clipboard fallback instead.
const MCP_PROVIDER_PROMPT_PARAMS: Record<string, string> = {
  claude: 'q',
  chatgpt: 'q',
};

export function providerSupportsPromptUrl(providerKey: string) {
  return Object.prototype.hasOwnProperty.call(MCP_PROVIDER_PROMPT_PARAMS, providerKey);
}

export function getMcpProviderLaunchUrl(providerKey: string, prompt?: string) {
  const baseUrl = MCP_PROVIDER_URLS[providerKey];
  const promptParam = MCP_PROVIDER_PROMPT_PARAMS[providerKey];
  if (!baseUrl || !prompt || !promptParam) return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set(promptParam, prompt);
  return url.toString();
}

interface McpDraftActionsProps {
  connectedMcpProviders: ConnectedMcpProvider[];
  onDraftWithProvider: (provider: ConnectedMcpProvider) => void;
  eyebrow?: string;
  title?: string;
  description?: string;
  providerAction?: string;
}

export function ProviderIcon({ providerKey }: { providerKey: string }) {
  if (providerKey === 'claude') return <Claude.Color size={18} />;
  if (providerKey === 'chatgpt') {
    return <OpenAI aria-hidden="true" className="text-foreground" size={18} />;
  }
  if (providerKey === 'gemini') return <Gemini.Color size={18} />;
  return <Sparkles className="h-4 w-4" />;
}

export function McpDraftActions({
  connectedMcpProviders,
  onDraftWithProvider,
  eyebrow = 'Choose where to draft',
  title = 'Use a connected AI app',
  description = 'Choose an AI app to give your Jobmark draft another pass.',
  providerAction = 'Draft with',
}: McpDraftActionsProps) {
  return (
    <div className="border-border/50 bg-card/30 rounded-2xl border p-5">
      <div className="flex flex-col gap-1">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">{eyebrow}</p>
        <h3 className="text-foreground font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
        {connectedMcpProviders.some(provider => provider.key === 'gemini') && (
          <p className="text-muted-foreground mt-1 text-xs">
            Gemini opens separately. Your instructions are copied so you can paste them into the
            message box.
          </p>
        )}
      </div>

      {connectedMcpProviders.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {connectedMcpProviders.map(provider => (
            <Button
              key={provider.key}
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={() => onDraftWithProvider(provider)}
            >
              <ProviderIcon providerKey={provider.key} />
              <span className="ml-2">
                {getMcpProviderLaunchUrl(provider.key)
                  ? `${providerAction} ${provider.name}`
                  : `Copy for ${provider.name}`}
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <Button asChild variant="outline" className="mt-4 h-11 rounded-xl px-4">
          <Link href="/settings/connections">
            <Link2 className="mr-2 h-4 w-4" />
            Connect an AI app
          </Link>
        </Button>
      )}
    </div>
  );
}

interface McpProviderMenuProps {
  connectedMcpProviders: ConnectedMcpProvider[];
  onOpenProvider: (provider: ConnectedMcpProvider) => void;
}

/**
 * A compact provider chooser for post-draft actions. One connection gets a
 * direct action; multiple connections get a menu, so “Open in…” is never
 * ambiguous.
 */
export function McpProviderMenu({ connectedMcpProviders, onOpenProvider }: McpProviderMenuProps) {
  if (connectedMcpProviders.length === 0) {
    return (
      <Button
        asChild
        variant="outline"
        className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
      >
        <Link href="/settings/connections">
          <Link2 className="mr-2 h-4 w-4" />
          Connect an AI app
        </Link>
      </Button>
    );
  }

  if (connectedMcpProviders.length === 1) {
    const provider = connectedMcpProviders[0];
    const launchUrl = getMcpProviderLaunchUrl(provider.key);
    return (
      <Button
        type="button"
        variant="outline"
        className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
        onClick={() => onOpenProvider(provider)}
      >
        <ProviderIcon providerKey={provider.key} />
        <span className="ml-2">
          {launchUrl ? `Open in ${provider.name}` : `Copy for ${provider.name}`}
        </span>
        <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Choose where to continue
          <ChevronDown className="text-muted-foreground ml-auto h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {connectedMcpProviders.map(provider => (
          <DropdownMenuItem
            key={provider.key}
            onSelect={() => onOpenProvider(provider)}
            className="cursor-pointer"
          >
            <ProviderIcon providerKey={provider.key} />
            <span>
              {getMcpProviderLaunchUrl(provider.key)
                ? `Open in ${provider.name}`
                : `Copy for ${provider.name}`}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
