'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  'jobmark:read': { label: 'Read', description: 'View your activities, projects, goals, and contacts' },
  'jobmark:write': { label: 'Write', description: 'Create and update your activities, projects, goals, and contacts' },
  'jobmark:destructive': { label: 'Delete', description: 'Delete activities, projects, goals, and contacts' },
  'offline_access': { label: 'Offline access', description: 'Maintain access when you are not actively using the app' },
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

  const scopes = scope.split(' ').filter(Boolean);

  async function handleSubmit(action: 'allow' | 'deny') {
    setSubmitting(true);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/mcp/authorize';

    const fields: Record<string, string> = {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Authorize MCP Connection</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            An AI assistant is requesting access to your Jobmark account.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Requested permissions</h3>
            <ul className="space-y-2">
              {scopes.map((s) => {
                const info = SCOPE_LABELS[s];
                return (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{info?.label ?? s}</span>
                      {info?.description && (
                        <span className="text-muted-foreground ml-1">— {info.description}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Client ID</p>
            <p className="font-mono break-all">{clientId}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={submitting}
              onClick={() => handleSubmit('deny')}
              type="button"
            >
              <X className="h-4 w-4 mr-2" />
              Deny
            </Button>
            <Button
              className="flex-1"
              disabled={submitting}
              onClick={() => handleSubmit('allow')}
              type="button"
            >
              <Check className="h-4 w-4 mr-2" />
              Allow
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ConsentForm />
    </Suspense>
  );
}
