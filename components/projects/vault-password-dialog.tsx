/**
 * Vault Password Dialog
 *
 * Why: Users need a secure way to set up and enter their vault password.
 * This dialog handles two modes:
 * - "setup": First-time password creation with confirmation
 * - "unlock": Password entry to unlock the vault
 *
 * Design: Follows the existing dialog patterns in project-list.tsx.
 * Uses useTransition for loading states and shows inline errors.
 */
'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setVaultPassword, unlockVault } from '@/app/actions/project-lock';
import { Loader2, AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VaultPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'setup' | 'unlock';
  onSuccess?: () => void;
}

export function VaultPasswordDialog({
  open,
  onOpenChange,
  mode,
  onSuccess,
}: VaultPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      if (mode === 'setup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const result = await setVaultPassword(password, confirmPassword);
        if (result.success) {
          onOpenChange(false);
          setPassword('');
          setConfirmPassword('');
          router.refresh();
          onSuccess?.();
        } else {
          setError(result.message);
        }
      } else {
        const result = await unlockVault(password);
        if (result.success) {
          onOpenChange(false);
          setPassword('');
          router.refresh();
          onSuccess?.();
        } else {
          setError(result.message);
        }
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {mode === 'setup' ? (
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <ShieldCheck className="text-primary h-5 w-5" />
              </div>
            ) : (
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Lock className="text-primary h-5 w-5" />
              </div>
            )}
            <div>
              <DialogTitle>
                {mode === 'setup' ? 'Set Up Vault Password' : 'Unlock Vault'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'setup'
                  ? 'Create a password to protect your locked projects.'
                  : 'Enter your vault password to view locked projects.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="vault-password">Password</Label>
            <Input
              id="vault-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'setup' ? 'Create a vault password' : 'Enter vault password'}
              autoFocus
              minLength={6}
              required
            />
          </div>

          {mode === 'setup' && (
            <div className="space-y-2">
              <Label htmlFor="vault-confirm">Confirm Password</Label>
              <Input
                id="vault-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                minLength={6}
                required
              />
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm font-medium">{error}</p>
          )}

          {mode === 'setup' && (
            <div className="bg-destructive/5 border-destructive/20 flex items-start gap-2.5 rounded-lg border p-3">
              <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground text-xs leading-relaxed">
                <strong className="text-foreground">There is no password recovery.</strong> If you
                forget this password, the data can only be recovered via support.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'setup' ? 'Set Password' : 'Unlock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
