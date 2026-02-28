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
import { Pen } from 'lucide-react';
import Link from 'next/link';
import { signInWithGoogle } from '@/app/actions/auth';

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
            <div className="bg-primary/20 border-primary/30 flex h-11 w-11 items-center justify-center rounded-xl border">
              <Pen className="text-primary h-5 w-5" />
            </div>
          </div>
        </div>

        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-serif text-2xl font-bold">Welcome to Jobmark</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in to start tracking your wins
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

function GoogleIcon() {
  return (
    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
