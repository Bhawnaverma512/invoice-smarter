import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";

import { SitePage } from "@/components/site/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_EMAIL } from "@/lib/site-content";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact | Smart Invoice & Follow-Up" }] }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || !form.message.trim()) {
      toast.error("Please enter your name, a valid email and a message");
      return;
    }
    const subject = encodeURIComponent(`Message from ${form.name.trim()}`);
    const body = encodeURIComponent(`${form.message.trim()}\n\n${form.name.trim()}\n${form.email.trim()}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app with the message ready to send");
  }

  return (
    <SitePage>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-3 text-muted-foreground">Questions, feedback or need help? Send us a message.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="ct-name">Your name</Label>
            <Input id="ct-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-email">Your email</Label>
            <Input id="ct-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-msg">Message</Label>
            <Textarea id="ct-msg" rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">
            <Mail className="mr-2 h-4 w-4" /> Send message
          </Button>
          <p className="text-xs text-muted-foreground">This opens your email app addressed to {CONTACT_EMAIL}. You press Send there.</p>
        </form>
      </section>
    </SitePage>
  );
}
