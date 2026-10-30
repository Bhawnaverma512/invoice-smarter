import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/format";
import { useBusiness } from "@/lib/business-context";

export function SetupBusiness() {
  const { createBusiness } = useBusiness();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [terms, setTerms] = React.useState("14");
  const [tax, setTax] = React.useState("0");
  const [loadDemo, setLoadDemo] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Business name is required");
      return;
    }
    setBusy(true);
    await createBusiness({
      name,
      email,
      currency,
      payment_terms: Number(terms) || 14,
      tax_rate: Number(tax) || 0,
      load_demo: loadDemo,
    });
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome — set up your business</CardTitle>
          <CardDescription>
            One quick step before you start invoicing. You can change all of this later in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz-name">Business name</Label>
              <Input id="biz-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-email">Business email (optional)</Label>
              <Input id="biz-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-terms">Payment terms (days)</Label>
                <Input id="biz-terms" type="number" min="0" max="120" value={terms} onChange={(e) => setTerms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-tax">Default tax %</Label>
                <Input id="biz-tax" type="number" min="0" max="100" step="0.1" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={loadDemo} onCheckedChange={(v) => setLoadDemo(v === true)} className="mt-0.5" />
              <span>
                Load clearly labeled <strong>sample data</strong> (5 demo customers, 10 demo invoices,
                payments and reminder rules) so you can explore the app immediately.
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create business
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
