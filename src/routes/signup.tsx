import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

import { AuthShell, OrDivider, SocialButtons } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app/dashboard", replace: true });
  },
  head: () => ({ meta: [{ title: "Sign Up | Smart Invoice & Follow-Up" }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use a password with at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin + "/app/dashboard",
          ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
        },
      });
      if (error) throw error;
      if (data.session) void navigate({ to: "/app/dashboard" });
      else setSentTo(email.trim());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" subtitle="One more step to activate your account.">
        <div className="rounded-2xl border bg-emerald-50/60 p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-sm">
            We sent a confirmation link to <span className="font-semibold">{sentTo}</span>. Open it, then log in. After your first login you will
            set up your business profile.
          </p>
          <Link to="/login" className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Go to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your free account" subtitle="Start sending invoices and automating follow-ups in minutes.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="su-name">Full name</Label>
          <Input id="su-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-email">Email</Label>
          <Input id="su-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-password">Password</Label>
          <Input id="su-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link to="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
      <OrDivider />
      <SocialButtons disabled={busy} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
