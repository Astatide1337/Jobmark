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
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle>Invalid Link</CardTitle>
          <CardDescription>This change-password link is missing a required parameter.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setStatus('error');
      setMessage('New password must be at least 12 characters');
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
        setMessage(data.message || 'Password changed successfully');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to change password');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <KeyRound className="mx-auto h-12 w-12 text-primary" />
        <CardTitle>Change Vault Password</CardTitle>
        <CardDescription>
          Enter your current password and choose a new one. This link expires in 5 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' ? (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">You can close this tab and return to your AI assistant.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Current vault password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={12}
                autoFocus
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="New vault password (min 12 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Confirm new vault password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-destructive">{message}</p>
            )}
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Changing password...' : 'Change Password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VaultChangePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense>
        <VaultChangePasswordForm />
      </Suspense>
    </div>
  );
}
