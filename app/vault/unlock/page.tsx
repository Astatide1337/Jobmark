'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

function VaultUnlockForm() {
  const searchParams = useSearchParams();
  const nonce = searchParams.get('nonce');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!nonce) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="text-destructive mx-auto h-12 w-12" />
          <CardTitle>This link is no longer valid</CardTitle>
          <CardDescription>Return to your AI app and start the connection again.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/vault/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Vault unlocked successfully');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unlock vault');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Lock className="text-primary mx-auto h-12 w-12" />
        <CardTitle>Unlock protected project</CardTitle>
        <CardDescription>Enter your password to use this protected project.</CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="space-y-4 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-muted-foreground text-sm">{message}</p>
            <p className="text-muted-foreground text-xs">
              You can close this tab and return to your AI app.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="vault-unlock-password" className="sr-only">
                Project password
              </label>
              <Input
                id="vault-unlock-password"
                type="password"
                placeholder="Vault password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                autoFocus
              />
            </div>
            {status === 'error' && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Unlocking...' : 'Unlock project'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VaultUnlockPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <VaultUnlockForm />
      </Suspense>
    </div>
  );
}
