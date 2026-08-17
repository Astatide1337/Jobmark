'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, KeyRound, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export type VaultPasswordMode = 'setup' | 'unlock' | 'change-password';

const MODE_CONFIG: Record<
  VaultPasswordMode,
  {
    endpoint: string;
    icon: typeof Shield;
    title: string;
    description: string;
    submitLabel: string;
    loadingLabel: string;
    successMessage: string;
    errorMessage: string;
  }
> = {
  setup: {
    endpoint: '/api/vault/setup',
    icon: Shield,
    title: 'Set up private projects',
    description:
      'Create a password to hide selected projects. It is separate from your account password.',
    submitLabel: 'Set password',
    loadingLabel: 'Saving...',
    successMessage: 'Private projects are ready.',
    errorMessage: 'Could not set up private projects.',
  },
  unlock: {
    endpoint: '/api/vault/unlock',
    icon: Lock,
    title: 'Open private projects',
    description: 'Enter your password to view them.',
    submitLabel: 'Open projects',
    loadingLabel: 'Opening...',
    successMessage: 'Private projects are open.',
    errorMessage: 'Could not open private projects.',
  },
  'change-password': {
    endpoint: '/api/vault/change-password',
    icon: KeyRound,
    title: 'Change private project password',
    description: 'Enter your current password, then choose a new one.',
    submitLabel: 'Change password',
    loadingLabel: 'Changing password...',
    successMessage: 'Password changed.',
    errorMessage: 'Could not change the password.',
  },
};

function VaultCard({ children }: { children: React.ReactNode }) {
  return <Card className="w-full max-w-md">{children}</Card>;
}

function MissingNonceCard() {
  return (
    <VaultCard>
      <CardHeader className="text-center">
        <AlertCircle className="text-destructive mx-auto h-12 w-12" />
        <CardTitle>This link is no longer valid</CardTitle>
        <CardDescription>Return to your assistant and start the connection again.</CardDescription>
      </CardHeader>
    </VaultCard>
  );
}

function LoadingCard() {
  return (
    <VaultCard>
      <CardContent className="text-muted-foreground p-8 text-center text-sm">
        Loading...
      </CardContent>
    </VaultCard>
  );
}

function VaultPasswordForm({ mode }: { mode: VaultPasswordMode }) {
  const searchParams = useSearchParams();
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;
  const nonce = searchParams.get('nonce');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!nonce) return <MissingNonceCard />;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode !== 'unlock' && password !== confirmPassword) {
      setStatus('error');
      setMessage(mode === 'setup' ? 'Passwords do not match.' : 'New passwords do not match.');
      return;
    }

    if (mode !== 'unlock' && password.length < 12) {
      setStatus('error');
      setMessage(
        mode === 'setup'
          ? 'Password must be at least 12 characters.'
          : 'Use at least 12 characters for the new password.'
      );
      return;
    }

    setStatus('loading');

    let body: { nonce: string; password?: string; currentPassword?: string; newPassword?: string };
    if (mode === 'change-password') {
      body = { nonce, currentPassword, newPassword: password };
    } else {
      body = { nonce, password };
    }

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: { message?: string; error?: string } = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || config.successMessage);
      } else {
        setStatus('error');
        setMessage(data.error || config.errorMessage);
      }
    } catch {
      setStatus('error');
      setMessage('Jobmark could not be reached. Check your connection and try again.');
    }
  };

  const passwordLabel =
    mode === 'unlock' ? 'Private project password' : 'New private project password';
  const passwordId = mode === 'unlock' ? 'vault-unlock-password' : 'vault-password';

  return (
    <VaultCard>
      <CardHeader className="text-center">
        <Icon className="text-primary mx-auto h-12 w-12" />
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="space-y-4 text-center" role="status">
            <CheckCircle className="text-success mx-auto h-12 w-12" />
            <p className="text-muted-foreground text-sm">{message}</p>
            <p className="text-muted-foreground text-xs">
              You can close this tab and return to your assistant.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'change-password' && (
              <div>
                <label htmlFor="current-vault-password" className="sr-only">
                  Current private project password
                </label>
                <Input
                  id="current-vault-password"
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                  required
                  minLength={12}
                  autoFocus
                />
              </div>
            )}
            <div>
              <label htmlFor={passwordId} className="sr-only">
                {passwordLabel}
              </label>
              <Input
                id={passwordId}
                type="password"
                placeholder={
                  mode === 'unlock'
                    ? 'Project password'
                    : 'New project password (min 12 characters)'
                }
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                minLength={12}
                autoFocus={mode !== 'change-password'}
              />
            </div>
            {mode !== 'unlock' && (
              <div>
                <label htmlFor="vault-password-confirm" className="sr-only">
                  Confirm private project password
                </label>
                <Input
                  id="vault-password-confirm"
                  type="password"
                  placeholder={
                    mode === 'setup' ? 'Confirm project password' : 'Confirm new password'
                  }
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  required
                  minLength={12}
                />
              </div>
            )}
            {status === 'error' && (
              <p className="text-destructive text-sm" role="alert">
                {message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? config.loadingLabel : config.submitLabel}
            </Button>
          </form>
        )}
      </CardContent>
    </VaultCard>
  );
}

export function VaultPasswordPage({ mode }: { mode: VaultPasswordMode }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<LoadingCard />}>
        <VaultPasswordForm mode={mode} />
      </Suspense>
    </div>
  );
}
