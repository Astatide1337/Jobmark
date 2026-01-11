import Link from "next/link";
import { signInWithGoogle } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Pen, Lock, Trash2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center">
              <Pen className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">Jobmark</span>
          </Link>
        </div>

        {/* Login Card */}
        <Card className="bg-card border-border/50 ambient-shadow">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue tracking your wins
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Google Sign In */}
            <form action={signInWithGoogle}>
              <Button 
                type="submit" 
                variant="outline" 
                size="lg" 
                className="w-full h-12 text-base"
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </form>

            <div className="my-8">
              <Separator className="bg-border/50" />
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4">
              <TrustItem icon={Lock} text="Encrypted" />
              <TrustItem icon={ShieldCheck} text="Private" />
              <TrustItem icon={Trash2} text="Deletable" />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-foreground hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-foreground hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

function TrustItem({ 
  icon: Icon, 
  text 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
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
