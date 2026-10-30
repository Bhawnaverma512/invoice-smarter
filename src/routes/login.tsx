import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AuthShell, OrDivider, SocialButtons } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app/dashboard", replace: true });
  },
  head: () => ({ meta: [{ title: "Login | Smart Invoice & Follow-Up" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      void navigate({ to: "/app/dashboard" });
    } catch (err) {
      const message = (err as Error).message;
      if (/not confirmed/i.test(message)) {
        toast.error("Please confirm your email first. Open the link we sent you.", {
          action: {
            label: "Resend email",
            onClick: async () => {
              const { error } = await supabase.auth.resend({
                type: "signup",
                email: email.trim(),
                options: { emailRedirectTo: window.location.origin + "/app/dashboard" },
              });
              if (error) toast.error(error.message);
              else toast.success("Confirmation email sent. Check your inbox and spam folder.");
            },
          },
        });
      } else if (/invalid login credentials/i.test(message)) {
        toast.error("That email and password don't match an account. New here? Create an account. Forgot it? Reset your password.");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your invoices and follow-ups.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log in
        </Button>
      </form>
      <OrDivider />
      <SocialButtons disabled={busy} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}
