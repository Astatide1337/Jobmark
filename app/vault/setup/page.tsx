'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

function VaultSetupForm() {
  const searchParams = useSearchParams();
  const nonce = searchParams.get('nonce');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 12) {
      setStatus('error');
      setMessage('Password must be at least 12 characters');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/vault/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Vault password set successfully');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to set vault password');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Shield className="text-primary mx-auto h-12 w-12" />
        <CardTitle>Protect a project</CardTitle>
        <CardDescription>
          Create a password to protect sensitive projects. This password is separate from your
          account login.
        </CardDescription>
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
              <label htmlFor="vault-password" className="sr-only">
                New vault password
              </label>
              <Input
                id="vault-password"
                type="password"
                placeholder="New vault password (min 12 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="vault-password-confirm" className="sr-only">
                Confirm vault password
              </label>
              <Input
                id="vault-password-confirm"
                type="password"
                placeholder="Confirm vault password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            {status === 'error' && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Protecting project...' : 'Protect project'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VaultSetupPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <VaultSetupForm />
      </Suspense>
    </div>
  );
}
