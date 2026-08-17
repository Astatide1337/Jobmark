'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

function VaultChangePasswordForm() {
  const searchParams = useSearchParams();
  const nonce = searchParams.get('nonce');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!nonce) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="text-destructive mx-auto h-12 w-12" />
          <CardTitle>This link is no longer valid</CardTitle>
          <CardDescription>
            Return to your assistant and start the connection again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 12) {
      setStatus('error');
      setMessage('Use at least 12 characters for the new password.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/vault/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Password changed.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Could not change the password.');
      }
    } catch {
      setStatus('error');
      setMessage('Jobmark could not be reached. Check your connection and try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <KeyRound className="text-primary mx-auto h-12 w-12" />
        <CardTitle>Change private project password</CardTitle>
        <CardDescription>Enter your current password, then choose a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="space-y-4 text-center">
            <CheckCircle className="text-success mx-auto h-12 w-12" />
            <p className="text-muted-foreground text-sm">{message}</p>
            <p className="text-muted-foreground text-xs">
              You can close this tab and return to your assistant.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="current-vault-password" className="sr-only">
                Current private project password
              </label>
              <Input
                id="current-vault-password"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                minLength={12}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="new-vault-password" className="sr-only">
                New private project password
              </label>
              <Input
                id="new-vault-password"
                type="password"
                placeholder="New password (min 12 characters)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            <div>
              <label htmlFor="confirm-vault-password" className="sr-only">
                Confirm new private project password
              </label>
              <Input
                id="confirm-vault-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            {status === 'error' && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Changing password...' : 'Change password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VaultChangePasswordPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <VaultChangePasswordForm />
      </Suspense>
    </div>
  );
}
