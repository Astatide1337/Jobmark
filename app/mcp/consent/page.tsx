'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  'jobmark:read': {
    label: 'Read',
    description: 'View your activities, projects, goals, and contacts',
  },
  'jobmark:write': {
    label: 'Write',
    description: 'Create and update your activities, projects, goals, and contacts',
  },
  'jobmark:destructive': {
    label: 'Delete',
    description: 'Delete activities, projects, goals, and contacts',
  },
  offline_access: {
    label: 'Offline access',
    description: 'Stay connected between sessions',
  },
};

function ConsentForm() {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const clientId = searchParams.get('client_id') ?? '';
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const scope = searchParams.get('scope') ?? '';
  const state = searchParams.get('state') ?? '';
  const codeChallenge = searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? '';
  const transaction = searchParams.get('transaction') ?? '';

  const scopes = scope.split(' ').filter(Boolean);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(() => scopes);

  function toggleScope(scopeName: string, selected: boolean) {
    setSelectedScopes(current =>
      selected ? [...new Set([...current, scopeName])] : current.filter(item => item !== scopeName)
    );
  }

  async function handleSubmit(action: 'allow' | 'deny') {
    setSubmitting(true);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/mcp/authorize';

    const fields: Record<string, string> = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: selectedScopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      transaction,
      action,
    };

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="border-border/50 bg-card/60 w-full max-w-lg overflow-hidden rounded-3xl shadow-sm">
        <CardHeader className="relative p-8 text-center">
          <div className="border-primary/20 bg-primary/10 absolute -top-16 -right-16 h-40 w-40 rounded-full border blur-3xl" />
          <div className="bg-primary/10 text-primary relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Shield className="h-7 w-7" />
          </div>
          <CardTitle className="relative text-2xl tracking-tight">
            Connect this plugin to Jobmark
          </CardTitle>
          <CardDescription className="relative mx-auto mt-3 max-w-sm leading-relaxed">
            Choose what the plugin can access. You can remove this connection at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Choose permissions</h3>
            <ul className="space-y-2">
              {scopes.map(s => {
                const info = SCOPE_LABELS[s];
                const isSelected = selectedScopes.includes(s);
                return (
                  <li key={s} className="bg-muted/20 rounded-2xl border text-sm">
                    <div className="flex items-start gap-3 p-4">
                      <Checkbox
                        id={`scope-${s.replace(/[^a-z0-9]+/gi, '-')}`}
                        checked={isSelected}
                        onCheckedChange={checked => toggleScope(s, checked === true)}
                        aria-label={`${isSelected ? 'Remove' : 'Allow'} ${info?.label ?? s} permission`}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`scope-${s.replace(/[^a-z0-9]+/gi, '-')}`}
                        className="min-w-0 cursor-pointer"
                      >
                        <span className="font-medium">{info?.label ?? s}</span>
                        {info?.description && (
                          <span className="text-muted-foreground mt-1 block leading-relaxed">
                            {info.description}
                          </span>
                        )}
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => handleSubmit('deny')}
              type="button"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={submitting || selectedScopes.length === 0}
              onClick={() => handleSubmit('allow')}
              type="button"
            >
              <Check className="mr-2 h-4 w-4" />
              Connect plugin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ConsentForm />
    </Suspense>
  );
}
