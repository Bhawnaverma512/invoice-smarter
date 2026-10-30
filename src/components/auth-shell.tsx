import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/site/site-chrome";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { BENEFITS } from "@/lib/site-content";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              Back to website
            </Link>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-white/10" aria-hidden />
        <h2 className="relative text-3xl font-bold leading-tight">Create invoices smarter. Get paid faster.</h2>
        <ul className="relative mt-8 space-y-4">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 text-emerald-50">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const isLocalhost = () =>
  typeof window !== "undefined" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

/** Google and Lovable sign-in buttons. On localhost Lovable's sign-in address doesn't exist, so Google goes straight to the backend when it is set up. */
export function SocialButtons({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const local = isLocalhost();

  async function go(provider: "google" | "lovable") {
    if (local) {
      if (provider === "google") {
        const redirectTo = `${window.location.origin}/app/dashboard`;
        const authorize = `${import.meta.env["VITE_SUPABASE_URL"]}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
        setBusy(true);
        try {
          const probe = await fetch(authorize, {
            redirect: "manual",
            headers: { apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] },
          });
          if (probe.type === "opaqueredirect") {
            window.location.href = authorize;
            return;
          }
        } catch {
          /* unreachable or blocked: treated as not set up */
        } finally {
          setBusy(false);
        }
        toast.info(
          "Google sign-in isn't set up for localhost yet. Add your own Google client ID and secret in your Lovable authentication settings, or use email and password.",
        );
        return;
      }
      toast.info("Lovable sign-in only works on your Lovable site, not on localhost. Use email and password here.");
      return;
    }
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) toast.error(result.error.message);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => go("google")} disabled={disabled || busy}>
          Continue with Google
        </Button>
        <Button type="button" variant="outline" onClick={() => go("lovable")} disabled={disabled || busy}>
          Continue with Lovable
        </Button>
      </div>
      {local && (
        <p className="text-center text-xs text-muted-foreground">
          Google and Lovable sign-in work on your Lovable site. On localhost, use email and password.
        </p>
      )}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}
