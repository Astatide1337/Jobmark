'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { signInWithGoogle } from '@/app/actions/auth';
import { GoogleIcon } from '@/components/auth/google-icon';
import { JobmarkMark } from '@/components/brand/jobmark-mark';

interface AuthModalContextType {
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}

interface AuthModalProviderProps {
  children: ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openAuthModal = useCallback(() => setIsOpen(true), []);
  const closeAuthModal = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal, isOpen }}>
      {children}
      <AuthModal open={isOpen} />
    </AuthModalContext.Provider>
  );
}

interface AuthModalProps {
  open: boolean;
}

function AuthModal({ open }: AuthModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
        className="bg-card border-border/50 max-w-md"
      >
        <div className="mb-2 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-11 w-11 items-center justify-center rounded-xl">
              <JobmarkMark className="h-6 w-6" sizes="24px" />
            </div>
          </div>
        </div>

        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-serif text-2xl font-bold">Welcome to Jobmark</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in to start building your career record
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <form action={signInWithGoogle}>
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="border-border/60 hover:bg-accent hover:border-border h-12 w-full text-base"
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-foreground hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-foreground hover:underline">
            Privacy Policy
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
