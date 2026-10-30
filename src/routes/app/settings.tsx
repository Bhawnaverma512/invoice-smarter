import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Building2, Check, CreditCard, FileText, Loader2, LogOut, Receipt, Upload, User, BellRing } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, formatMoney } from "@/lib/format";
import { getPrefs, setPrefs, type Prefs } from "@/lib/prefs";
import type { Database } from "@/integrations/supabase/types";

type BusinessPatch = Database["public"]["Tables"]["businesses"]["Update"];

export const Route = createFileRoute("/app/settings")({ component: Settings });

const MAX_LOGO_BYTES = 200 * 1024;

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Settings() {
  const { business, profile, refresh } = useBusiness();
  const navigate = useNavigate();

  // Business profile
  const [biz, setBiz] = useState({ name: "", tax_id: "", email: "", phone: "", address: "", logo_url: "" });
  // Tax, currency and invoice defaults
  const [inv, setInv] = useState({
    currency: "USD",
    default_tax_rate: "0",
    default_payment_terms: "14",
    invoice_prefix: "",
    invoice_next_number: "1",
    invoice_notes: "",
    payment_instructions: "",
  });
  const [saving, setSaving] = useState<string | null>(null);

  // Account
  const [fullName, setFullName] = useState("");
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [prefs, setPrefsState] = useState<Prefs>(getPrefs);

  useEffect(() => {
    if (!business) return;
    setBiz({
      name: business.name,
      tax_id: business.tax_id ?? "",
      email: business.email ?? "",
      phone: business.phone ?? "",
      address: business.address ?? "",
      logo_url: business.logo_url ?? "",
    });
    setInv({
      currency: business.currency,
      default_tax_rate: String(business.default_tax_rate),
      default_payment_terms: String(business.default_payment_terms),
      invoice_prefix: business.invoice_prefix,
      invoice_next_number: String(business.invoice_next_number),
      invoice_notes: business.invoice_notes ?? "",
      payment_instructions: business.payment_instructions ?? "",
    });
  }, [business]);
  useEffect(() => setFullName(profile?.full_name ?? ""), [profile?.full_name]);

  async function saveBusiness(section: string, patch: BusinessPatch) {
    if (!business) return;
    setSaving(section);
    try {
      const { error } = await supabase.from("businesses").update(patch).eq("id", business.id);
      if (error) throw error;
      await refresh();
      toast.success("Settings saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function saveProfile() {
    if (!biz.name.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (biz.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(biz.email)) {
      toast.error("Enter a valid business email");
      return;
    }
    await saveBusiness("profile", {
      name: biz.name.trim(),
      tax_id: biz.tax_id.trim() || null,
      email: biz.email.trim() || null,
      phone: biz.phone.trim() || null,
      address: biz.address.trim() || null,
      logo_url: biz.logo_url.trim() || null,
    });
  }

  async function saveInvoicing() {
    const rate = Number(inv.default_tax_rate);
    const terms = Number(inv.default_payment_terms);
    const next = Number(inv.invoice_next_number);
    if (!(rate >= 0 && rate <= 100)) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }
    if (!Number.isInteger(terms) || terms < 0) {
      toast.error("Payment terms must be a whole number of days");
      return;
    }
    if (!Number.isInteger(next) || next < 1) {
      toast.error("Next invoice number must be 1 or more");
      return;
    }
    await saveBusiness("invoicing", {
      currency: inv.currency,
      default_tax_rate: rate,
      default_payment_terms: terms,
      invoice_prefix: inv.invoice_prefix.trim(),
      invoice_next_number: next,
      invoice_notes: inv.invoice_notes.trim() || null,
      payment_instructions: inv.payment_instructions.trim() || null,
    });
  }

  function onLogoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Choose an image file (PNG, JPG, SVG or WebP)");
    if (file.size > MAX_LOGO_BYTES) return void toast.error("Logo must be under 200 KB");
    const reader = new FileReader();
    reader.onload = () => setBiz((b) => ({ ...b, logo_url: String(reader.result) }));
    reader.onerror = () => toast.error("Couldn't read that file");
    reader.readAsDataURL(file);
  }

  async function saveAccount() {
    if (!profile) return;
    setSaving("account");
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", profile.id);
      if (error) throw error;
      await refresh();
      toast.success("Account updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function changePassword() {
    if (pw.next.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving("password");
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
      setPw({ next: "", confirm: "" });
      toast.success("Password changed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  function updatePrefs(next: Prefs) {
    setPrefsState(next);
    setPrefs(next);
  }

  const Busy = ({ id }: { id: string }) => (saving === id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null);
  const sample = formatMoney(1234.5, inv.currency);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business, invoices and account.</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="business">
            <Building2 className="mr-1.5 h-4 w-4" /> Business
          </TabsTrigger>
          <TabsTrigger value="invoicing">
            <Receipt className="mr-1.5 h-4 w-4" /> Tax &amp; invoices
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellRing className="mr-1.5 h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="account">
            <User className="mr-1.5 h-4 w-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="mr-1.5 h-4 w-4" /> Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="space-y-5 p-5">
            <h2 className="font-semibold">Business profile</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {biz.logo_url ? (
                  <img src={biz.logo_url} alt="Company logo" className="h-full w-full object-contain" />
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label className="cursor-pointer">
                      <Upload className="mr-1 h-4 w-4" /> Upload logo
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => onLogoFile(e.target.files?.[0])} />
                    </label>
                  </Button>
                  {biz.logo_url && (
                    <Button variant="ghost" size="sm" onClick={() => setBiz({ ...biz, logo_url: "" })}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP, up to 200 KB. Shown on your invoices.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" htmlFor="b-name">
                <Input id="b-name" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
              </Field>
              <Field label="GST / Tax number" htmlFor="b-tax" hint="Printed on your invoices.">
                <Input id="b-tax" value={biz.tax_id} onChange={(e) => setBiz({ ...biz, tax_id: e.target.value })} />
              </Field>
              <Field label="Business email" htmlFor="b-email">
                <Input id="b-email" type="email" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} />
              </Field>
              <Field label="Phone" htmlFor="b-phone">
                <Input id="b-phone" value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Business address" htmlFor="b-addr">
                  <Textarea id="b-addr" rows={3} value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
                </Field>
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving === "profile"}>
              <Busy id="profile" /> Save business profile
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="invoicing">
          <Card className="space-y-5 p-5">
            <h2 className="font-semibold">Currency &amp; tax</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Currency">
                <Select value={inv.currency} onValueChange={(v) => setInv({ ...inv, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default tax / GST (%)" htmlFor="i-tax">
                <Input id="i-tax" type="number" min="0" max="100" step="any" value={inv.default_tax_rate} onChange={(e) => setInv({ ...inv, default_tax_rate: e.target.value })} />
              </Field>
              <Field label="Payment terms (days)" htmlFor="i-terms" hint="Sets the default due date.">
                <Input id="i-terms" type="number" min="0" step="1" value={inv.default_payment_terms} onChange={(e) => setInv({ ...inv, default_payment_terms: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">Amounts will look like {sample}. Changing currency affects new invoices only.</p>

            <h2 className="border-t pt-5 font-semibold">Invoice customization</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice prefix" htmlFor="i-prefix" hint="For example INV- or LDG-.">
                <Input id="i-prefix" value={inv.invoice_prefix} onChange={(e) => setInv({ ...inv, invoice_prefix: e.target.value })} />
              </Field>
              <Field label="Next invoice number" htmlFor="i-next" hint="Only raise this if you want to skip ahead; lowering it can create duplicates.">
                <Input id="i-next" type="number" min="1" step="1" value={inv.invoice_next_number} onChange={(e) => setInv({ ...inv, invoice_next_number: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Payment instructions" htmlFor="i-pay" hint="Bank details or UPI ID shown on every invoice.">
                  <Textarea id="i-pay" rows={3} value={inv.payment_instructions} onChange={(e) => setInv({ ...inv, payment_instructions: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Default invoice notes" htmlFor="i-notes">
                  <Textarea id="i-notes" rows={3} value={inv.invoice_notes} onChange={(e) => setInv({ ...inv, invoice_notes: e.target.value })} />
                </Field>
              </div>
            </div>
            <Button onClick={saveInvoicing} disabled={saving === "invoicing"}>
              <Busy id="invoicing" /> Save invoice settings
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="space-y-5 p-5">
            <div>
              <h2 className="font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">These preferences are saved in this browser only.</p>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <span>
                <span className="block text-sm font-medium">Payment deadline alerts</span>
                <span className="text-xs text-muted-foreground">Show invoices that are due soon or overdue in the bell menu.</span>
              </span>
              <Switch
                checked={prefs.deadlineAlerts}
                onCheckedChange={(on) => updatePrefs({ ...prefs, deadlineAlerts: on })}
                aria-label="Payment deadline alerts"
              />
            </label>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <span>
                <span className="block text-sm font-medium">Alert window</span>
                <span className="text-xs text-muted-foreground">How many days before the due date an invoice appears.</span>
              </span>
              <Select
                value={String(prefs.alertDays)}
                onValueChange={(v) => updatePrefs({ ...prefs, alertDays: Number(v) })}
                disabled={!prefs.deadlineAlerts}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Customer reminders are managed under Reminders and Follow-Up Automation.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">Account</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="a-name">
                  <Input id="a-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </Field>
                <Field label="Email" htmlFor="a-email" hint="Your sign-in email.">
                  <Input id="a-email" value={profile?.email ?? ""} readOnly disabled />
                </Field>
              </div>
              <Button onClick={saveAccount} disabled={saving === "account"}>
                <Busy id="account" /> Save account
              </Button>
            </Card>

            <Card className="space-y-4 p-5">
              <h2 className="font-semibold">Change password</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password" htmlFor="pw-new">
                  <Input id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                </Field>
                <Field label="Confirm new password" htmlFor="pw-confirm">
                  <Input id="pw-confirm" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </Field>
              </div>
              <Button onClick={changePassword} disabled={saving === "password" || !pw.next}>
                <Busy id="password" /> Update password
              </Button>
            </Card>

            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h2 className="font-semibold">Sign out</h2>
                <p className="text-xs text-muted-foreground">End your session on this device.</p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  toast.success("Signed out");
                  void navigate({ to: "/login" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold">Subscription</h2>
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Billing isn’t connected yet, so there’s nothing to pay or manage here. Every feature is currently available on your account.
              The plans below are the ones planned for launch.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { name: "Starter", price: "₹499", perks: ["Up to 30 invoices / month", "Customer records", "Payment tracking"] },
                { name: "Pro", price: "₹1,299", perks: ["Unlimited invoices", "Automated reminders", "Reports & analytics"] },
                { name: "Agency", price: "₹2,499", perks: ["Everything in Pro", "Up to 10 teammates", "Priority support"] },
              ].map((p) => (
                <div key={p.name} className="rounded-xl border p-4">
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 text-2xl font-bold">
                    {p.price}
                    <span className="text-sm font-normal text-muted-foreground"> /month</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary" /> {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
