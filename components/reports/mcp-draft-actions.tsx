'use client';

import Link from 'next/link';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Claude, Gemini, OpenAI } from '@lobehub/icons';
import { ArrowRight, Link2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { copyTextToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

export interface ConnectedMcpProvider {
  key: string;
  name: string;
}

const MCP_PROVIDER_URLS: Record<string, string> = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
};

export function getMcpProviderLaunchUrl(providerKey: string): string | undefined {
  return Object.hasOwn(MCP_PROVIDER_URLS, providerKey) ? MCP_PROVIDER_URLS[providerKey] : undefined;
}

interface SelectedAssistant {
  provider: ConnectedMcpProvider;
  instructions: string;
}

interface Handoff {
  trigger: HTMLButtonElement;
  initialSelection?: SelectedAssistant;
}

function McpHandoffDialog({
  handoff,
  choices,
  onClose,
}: {
  handoff: Handoff;
  choices?: { providers: ConnectedMcpProvider[]; buildInstructions: () => string };
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(handoff.initialSelection);

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={event => {
          event.preventDefault();
          handoff.trigger.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {selected ? `Instructions for ${selected.provider.name}` : 'Choose an assistant'}
          </DialogTitle>
          <DialogDescription>
            {selected
              ? 'Copy these instructions and paste them into your assistant.'
              : 'Choose where you want to edit this draft.'}
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <HandoffInstructions {...selected} />
        ) : (
          choices && (
            <div className="grid gap-2">
              {choices.providers.map(provider => (
                <Button
                  key={provider.key}
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() =>
                    setSelected({ provider, instructions: choices.buildInstructions() })
                  }
                >
                  <ProviderIcon providerKey={provider.key} />
                  Edit with {provider.name}
                </Button>
              ))}
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function HandoffInstructions({ provider, instructions }: SelectedAssistant) {
  const providerUrl = getMcpProviderLaunchUrl(provider.key);
  const instructionsId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');

  useLayoutEffect(() => {
    textarea.current?.focus();
  }, []);

  const copyInstructions = async () => {
    setCopyStatus('copying');
    const copied = await copyTextToClipboard(instructions).catch(() => false);
    setCopyStatus(copied ? 'copied' : 'failed');
  };

  return (
    <>
      <div className="grid gap-2">
        <label htmlFor={instructionsId} className="text-sm font-medium">
          Instructions
        </label>
        <Textarea
          id={instructionsId}
          ref={textarea}
          value={instructions}
          readOnly
          rows={8}
          className="field-sizing-fixed max-h-[40dvh] resize-none"
        />
        <p role="status" className="text-muted-foreground text-sm">
          {copyStatus === 'copied' && 'Instructions copied.'}
          {copyStatus === 'failed' &&
            'Could not copy the instructions. Select and copy the text manually.'}
        </p>
      </div>
      <DialogFooter className="flex-col">
        <Button type="button" onClick={copyInstructions} disabled={copyStatus === 'copying'}>
          Copy instructions
        </Button>
        {providerUrl && (
          <Button asChild variant="outline">
            <a href={providerUrl} target="_blank" rel="noopener noreferrer">
              Open {provider.name}
            </a>
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

interface McpDraftActionsProps {
  connectedMcpProviders: ConnectedMcpProvider[];
  buildInstructions: () => string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

function ProviderIcon({ providerKey }: { providerKey: string }) {
  if (providerKey === 'claude') return <Claude.Color size={18} />;
  if (providerKey === 'chatgpt') {
    return <OpenAI aria-hidden="true" className="text-foreground" size={18} />;
  }
  if (providerKey === 'gemini') return <Gemini.Color size={18} />;
  return <Sparkles className="h-4 w-4" />;
}

export function McpDraftActions({
  connectedMcpProviders,
  buildInstructions,
  eyebrow = 'Optional',
  title = 'Edit with an assistant',
  description = 'Use a connected assistant to edit the draft.',
}: McpDraftActionsProps) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  return (
    <div className="border-border/50 bg-card/30 rounded-2xl border p-5">
      <div className="flex flex-col gap-1">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">{eyebrow}</p>
        <h3 className="text-foreground font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {connectedMcpProviders.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {connectedMcpProviders.map(provider => (
            <Button
              key={provider.key}
              type="button"
              aria-haspopup="dialog"
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={event =>
                setHandoff({
                  trigger: event.currentTarget,
                  initialSelection: { provider, instructions: buildInstructions() },
                })
              }
            >
              <ProviderIcon providerKey={provider.key} />
              <span className="ml-2">Edit with {provider.name}</span>
            </Button>
          ))}
        </div>
      ) : (
        <Button asChild variant="outline" className="mt-4 h-11 rounded-xl px-4">
          <Link href="/settings/connections">
            <Link2 className="mr-2 h-4 w-4" />
            Connect an assistant
          </Link>
        </Button>
      )}
      {handoff && <McpHandoffDialog handoff={handoff} onClose={() => setHandoff(null)} />}
    </div>
  );
}

interface McpProviderMenuProps {
  connectedMcpProviders: ConnectedMcpProvider[];
  buildInstructions: () => string;
  className?: string;
}

export function McpProviderMenu({
  connectedMcpProviders,
  buildInstructions,
  className,
}: McpProviderMenuProps) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  if (connectedMcpProviders.length === 0) {
    return (
      <Button
        asChild
        variant="outline"
        className={cn(
          'border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent',
          className
        )}
      >
        <Link href="/settings/connections">
          <Link2 className="mr-2 h-4 w-4" />
          Connect an assistant
        </Link>
      </Button>
    );
  }

  const singleProvider = connectedMcpProviders.length === 1 ? connectedMcpProviders[0] : undefined;

  return (
    <>
      <Button
        type="button"
        aria-haspopup="dialog"
        variant="outline"
        className={cn(
          'border-muted-foreground/20 hover:border-muted-foreground/50 h-12 w-full justify-start rounded-xl hover:bg-transparent',
          className
        )}
        onClick={({ currentTarget: trigger }) =>
          setHandoff(
            singleProvider
              ? {
                  trigger,
                  initialSelection: { provider: singleProvider, instructions: buildInstructions() },
                }
              : { trigger }
          )
        }
      >
        {singleProvider ? (
          <>
            <ProviderIcon providerKey={singleProvider.key} />
            Edit with {singleProvider.name}
            <ArrowRight className="text-muted-foreground ml-auto h-4 w-4" />
          </>
        ) : (
          <>
            <ArrowRight className="h-4 w-4" />
            Continue with
          </>
        )}
      </Button>
      {handoff && (
        <McpHandoffDialog
          handoff={handoff}
          choices={{ providers: connectedMcpProviders, buildInstructions }}
          onClose={() => setHandoff(null)}
        />
      )}
    </>
  );
}
