import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceDocument, printInvoice, type InvoiceDoc } from "@/components/invoice-document";
import { addDaysISO, formatMoney, todayISO } from "@/lib/format";
import { invoiceMailto, markInvoiceSent, saveInvoice, totalsFor, type DiscountType } from "@/lib/invoices";

export const Route = createFileRoute("/app/create-invoice")({
  validateSearch: (s: Record<string, unknown>): { edit?: string } =>
    typeof s["edit"] === "string" ? { edit: s["edit"] } : {},
  component: CreateInvoice,
});

interface Line {
  description: string;
  quantity: string;
  unit_price: string;
}
const emptyLine = (): Line => ({ description: "", quantity: "1", unit_price: "" });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CreateInvoice() {
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { business } = useBusiness();
  const currency = business?.currency ?? "USD";

  const [customerId, setCustomerId] = useState<string>("new");
  const [cust, setCust] = useState({ name: "", email: "", phone: "", address: "" });
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [dueTouched, setDueTouched] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [taxRate, setTaxRate] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<null | "draft" | "send">(null);
  const [preview, setPreview] = useState(false);
  type Errors = Partial<Record<"name" | "email" | "due" | "items" | "discount", string>>;
  const [errors, setErrors] = useState<Errors>({});
  const [loadedNumber, setLoadedNumber] = useState<string | null>(null);
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);

  const terms = business?.default_payment_terms ?? 14;

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Defaults for a new invoice.
  useEffect(() => {
    if (edit || !business) return;
    setTaxRate((t) => (t === "" ? String(business.default_tax_rate ?? 0) : t));
  }, [edit, business]);
  useEffect(() => {
    if (!dueTouched && !edit) setDueDate(addDaysISO(issueDate, terms));
  }, [issueDate, terms, dueTouched, edit]);

  // Load an existing invoice for editing.
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["invoice-edit", edit],
    enabled: !!edit,
    queryFn: async () => {
      const { data: inv, error } = await supabase.from("invoices").select("*").eq("id", edit!).single();
      if (error) throw error;
      const { data: items, error: itemErr } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", edit!)
        .order("position");
      if (itemErr) throw itemErr;
      return { inv, items: items ?? [] };
    },
  });
  useEffect(() => {
    if (!existing) return;
    const { inv, items } = existing;
    setCustomerId(inv.customer_id);
    setIssueDate(inv.issue_date);
    setDueDate(inv.due_date);
    setDueTouched(true);
    setTaxRate(String(inv.tax_rate));
    setDiscountType(inv.discount_type as DiscountType);
    setDiscountValue(String(inv.discount_value || ""));
    setNotes(inv.notes ?? "");
    setLoadedNumber(inv.invoice_number);
    setLoadedStatus(inv.status);
    setLines(
      items.length
        ? items.map((i) => ({ description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) }))
        : [emptyLine()],
    );
  }, [existing]);

  // Selecting an existing customer fills the contact fields.
  useEffect(() => {
    if (customerId === "new") return;
    const c = customers.find((x) => x.id === customerId);
    if (c) setCust({ name: c.name, email: c.email, phone: c.phone ?? "", address: c.billing_address ?? "" });
  }, [customerId, customers]);

  const parsed = useMemo(
    () =>
      lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
      })),
    [lines],
  );
  const taxNum = Math.min(Math.max(Number(taxRate) || 0, 0), 100);
  const discNum = Math.max(Number(discountValue) || 0, 0);
  const totals = totalsFor({ items: parsed, tax_rate: taxNum, discount_type: discountType, discount_value: discNum });
  const money = (n: number) => formatMoney(n, currency);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!cust.name.trim()) e.name = "Customer name is required";
    if (!EMAIL_RE.test(cust.email.trim())) e.email = "Enter a valid email address";
    if (!dueDate) e.due = "Due date is required";
    else if (dueDate < issueDate) e.due = "Due date can't be before the invoice date";
    if (!parsed.some((l) => l.description.trim() && l.quantity > 0)) e.items = "Add at least one line item with a description and quantity";
    if (parsed.some((l) => l.unit_price < 0)) e.items = "Unit prices can't be negative";
    if (discountType === "percentage" && discNum > 100) e.discount = "Discount can't exceed 100%";
    setErrors(e);
    if (Object.keys(e).length) toast.error("Please fix the highlighted fields");
    return Object.keys(e).length === 0;
  }

  async function resolveCustomerId(): Promise<string> {
    if (customerId !== "new") return customerId;
    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: business!.id,
        name: cust.name.trim(),
        email: cust.email.trim(),
        phone: cust.phone.trim() || null,
        billing_address: cust.address.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  async function submit(mode: "draft" | "send") {
    if (!business || !validate()) return;
    setBusy(mode);
    try {
      const cid = await resolveCustomerId();
      const status = mode === "send" ? (loadedStatus && loadedStatus !== "draft" ? undefined : "sent") : edit ? undefined : "draft";
      const invoice = await saveInvoice(
        business,
        {
          customer_id: cid,
          issue_date: issueDate,
          due_date: dueDate,
          currency,
          tax_rate: taxNum,
          discount_type: discountType,
          discount_value: discNum,
          notes: notes.trim() || null,
          payment_terms: Math.max(0, Math.round((Date.parse(dueDate) - Date.parse(issueDate)) / 86400000)),
          items: parsed,
        },
        { ...(edit ? { id: edit } : {}), ...(status ? { status } : {}) },
      );
      if (mode === "send") {
        const scheduled = await markInvoiceSent(invoice);
        window.location.href = invoiceMailto({
          to: cust.email.trim(),
          customerName: cust.name.trim(),
          number: invoice.invoice_number,
          amount: Number(invoice.total),
          currency,
          dueDate: invoice.due_date,
          businessName: business.name,
          paymentInstructions: business.payment_instructions,
        });
        toast.success(`Invoice ${invoice.invoice_number} marked as sent${scheduled ? ` · ${scheduled} reminder(s) scheduled` : ""}`);
      } else {
        toast.success(`Invoice ${invoice.invoice_number} saved`);
      }
      void qc.invalidateQueries();
      void navigate({ to: "/app/invoices", search: {} });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function buildDoc(): InvoiceDoc {
    return {
      business: {
        name: business?.name ?? "",
        address: business?.address ?? null,
        email: business?.email ?? null,
        phone: business?.phone ?? null,
        tax_id: business?.tax_id ?? null,
        payment_instructions: business?.payment_instructions ?? null,
        logo_url: business?.logo_url ?? null,
      },
      customer: { name: cust.name || "Customer name", email: cust.email, phone: cust.phone, billing_address: cust.address },
      number: loadedNumber ?? "Assigned on save",
      status: loadedStatus ?? "draft",
      issue_date: issueDate,
      due_date: dueDate || issueDate,
      currency,
      items: parsed.filter((l) => l.description.trim()),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      tax_rate: taxNum,
      total: totals.total,
      paid_amount: Number(existing?.inv.paid_amount ?? 0),
      notes: notes.trim() || null,
    };
  }

  const fieldErr = (k: keyof Errors) => (errors[k] ? <p className="mt-1 text-xs text-destructive">{errors[k]}</p> : null);
  const locked = customerId !== "new";

  if (edit && loadingExisting) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{edit ? "Edit invoice" : "Create invoice"}</h1>
        <p className="text-sm text-muted-foreground">
          {edit ? `Editing ${loadedNumber ?? ""}` : "Fill in the details. Totals update as you type."}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-semibold">Invoice details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Invoice number</Label>
                <Input value={loadedNumber ?? "Auto-generated on save"} readOnly disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="issue">Invoice date</Label>
                <Input id="issue" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due">Due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  min={issueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setDueTouched(true);
                  }}
                  aria-invalid={!!errors.due}
                />
                {fieldErr("due")}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Customer</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Choose customer</Label>
                <Select
                  value={customerId}
                  onValueChange={(v) => {
                    setCustomerId(v);
                    if (v === "new") setCust({ name: "", email: "", phone: "", address: "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ New customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` · ${c.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Customer name</Label>
                <Input id="c-name" value={cust.name} disabled={locked} onChange={(e) => setCust({ ...cust, name: e.target.value })} aria-invalid={!!errors.name} />
                {fieldErr("name")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Customer email</Label>
                <Input id="c-email" type="email" value={cust.email} disabled={locked} onChange={(e) => setCust({ ...cust, email: e.target.value })} aria-invalid={!!errors.email} />
                {fieldErr("email")}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Customer phone</Label>
                <Input id="c-phone" value={cust.phone} disabled={locked} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-addr">Billing address</Label>
                <Textarea id="c-addr" rows={2} value={cust.address} disabled={locked} onChange={(e) => setCust({ ...cust, address: e.target.value })} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Products / services</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                <Plus className="mr-1 h-4 w-4" /> Add line
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="hidden grid-cols-[1fr_90px_130px_120px_36px] gap-3 text-xs text-muted-foreground sm:grid">
                <span>Description</span>
                <span>Quantity</span>
                <span>Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_90px_130px_120px_36px]">
                  <Input
                    className="col-span-2 sm:col-span-1"
                    placeholder="Description"
                    aria-label={`Line ${i + 1} description`}
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                  />
                  <Input type="number" min="0" step="any" aria-label={`Line ${i + 1} quantity`} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  <Input type="number" min="0" step="any" placeholder="0.00" aria-label={`Line ${i + 1} unit price`} value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
                  <div className="text-right text-sm font-medium">{money((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {fieldErr("items")}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Notes</h2>
            <Textarea className="mt-3" rows={3} placeholder="Thank you for your business." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold">Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tax">Tax / GST (%)</Label>
                <Input id="tax" type="number" min="0" max="100" step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percentage">Percent (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {discountType !== "none" && (
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="disc">{discountType === "percentage" ? "Discount (%)" : `Discount (${currency})`}</Label>
                  <Input id="disc" type="number" min="0" step="any" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                  {fieldErr("discount")}
                </div>
              )}
            </div>
            <dl className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd>− {money(totals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax / GST</dt>
                <dd>{money(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <dt>Grand total</dt>
                <dd>{money(totals.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-2 p-5">
            <Button className="w-full" onClick={() => submit("send")} disabled={busy !== null}>
              {busy === "send" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send invoice
            </Button>
            <Button className="w-full" variant="outline" onClick={() => submit("draft")} disabled={busy !== null}>
              {busy === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {edit ? "Save changes" : "Save draft"}
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setPreview(true)}>
              <Eye className="mr-2 h-4 w-4" /> Preview invoice
            </Button>
            <Button className="w-full" variant="outline" onClick={() => printInvoice(buildDoc())}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <p className="text-xs text-muted-foreground">
              “Download PDF” opens your browser’s print dialog. Choose “Save as PDF”. “Send invoice” marks it sent, schedules
              reminders and opens your email app with the message ready.
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
          </DialogHeader>
          <InvoiceDocument doc={buildDoc()} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
