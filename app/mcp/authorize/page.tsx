import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Connection could not start | Jobmark',
  description: 'Return to your AI app and start the Jobmark connection again.',
};

type AuthorizationErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_request: 'The AI app sent an incomplete or outdated connection request.',
  unauthorized_client: 'Jobmark could not recognize this AI app.',
  invalid_scope: 'The AI app requested permissions that are not available.',
};

function getErrorMessage(error: string | undefined): string {
  return ERROR_MESSAGES[error ?? ''] ?? 'The connection request could not be completed.';
}

export default async function AuthorizationErrorPage({
  searchParams,
}: AuthorizationErrorPageProps) {
  const { error } = await searchParams;

  return (
    <main className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
      <div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute -top-48 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-accent/10 pointer-events-none absolute -right-40 bottom-[-12rem] h-[28rem] w-[28rem] rounded-full blur-3xl"
      />

      <Card className="border-border/60 bg-card/60 relative z-10 w-full max-w-lg overflow-hidden rounded-3xl shadow-sm">
        <CardHeader className="p-8 text-center sm:p-10">
          <div className="bg-primary/10 text-primary mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-primary mb-3 text-xs font-semibold tracking-[0.24em] uppercase">
            MCP Connector
          </p>
          <CardTitle className="text-2xl tracking-tight sm:text-3xl">
            This connection could not start
          </CardTitle>
          <CardDescription className="mx-auto mt-3 max-w-md text-sm leading-6">
            {getErrorMessage(error)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-8 pb-8 sm:px-10 sm:pb-10">
          <div className="border-border/60 bg-muted/20 rounded-2xl border p-4 text-sm leading-6">
            <p className="text-foreground font-medium">Start a fresh connection</p>
            <p className="text-muted-foreground mt-1">
              Return to your AI app, open its Jobmark connection, and choose{' '}
              <strong>Reconnect</strong> or <strong>Add connection</strong>. This creates a new,
              secure request.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to Jobmark
              </Link>
            </Button>
            <Button asChild>
              <Link href="/articles/connect-jobmark-to-ai">
                Open connection guide
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export { getErrorMessage };
