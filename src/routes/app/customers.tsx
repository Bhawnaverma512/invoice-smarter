import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, FilePlus2, Mail, MapPin, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  PAYMENT_METHODS,
  effectiveStatus,
  formatDate,
  formatMoney,
  outstandingAmount,
  type CustomerRow,
} from "@/lib/format";

export const Route = createFileRoute("/app/customers")({ component: Customers });

type Filter = "all" | "active" | "overdue" | "settled";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "settled", label: "Settled" },
];

const STATUS_STYLE = {
  Overdue: "bg-destructive/15 text-destructive",
  Active: "bg-warning/15 text-warning",
  Settled: "bg-success/15 text-success",
  New: "bg-muted text-muted-foreground",
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyForm = { name: "", email: "", company: "", phone: "", address: "" };
const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;

function Customers() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerRow | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [viewId, setViewId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CustomerRow | null>(null);
  const currency = business?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["customers-invoices", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["customers-payments", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", business!.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      customers.map((c) => {
        const all = invoices.filter((i) => i.customer_id === c.id);
        const mine = all.filter((i) => i.status !== "cancelled");
        const paid = mine.reduce((s, i) => s + Number(i.paid_amount), 0);
        const billed = mine.reduce((s, i) => s + Number(i.total), 0);
        const due = mine.filter((i) => i.status !== "draft").reduce((s, i) => s + outstandingAmount(i), 0);
        const hasOverdue = mine.some((i) => effectiveStatus(i) === "overdue");
        const status: keyof typeof STATUS_STYLE =
          mine.length === 0 ? "New" : hasOverdue ? "Overdue" : due > 0 ? "Active" : "Settled";
        return { c, allCount: all.length, count: mine.length, paid, billed, due, status };
      }),
    [customers, invoices],
  );

  const visible = rows
    .filter(({ c, status }) => {
      const q = search.trim().toLowerCase();
      if (q && !`${c.name} ${c.company ?? ""} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "active") return status === "Active";
      if (filter === "overdue") return status === "Overdue";
      if (filter === "settled") return status === "Settled";
      return true;
    })
    .sort((a, b) => b.paid - a.paid);

  const totals = {
    customers: rows.length,
    paid: rows.reduce((s, r) => s + r.paid, 0),
    due: rows.reduce((s, r) => s + r.due, 0),
    invoices: rows.reduce((s, r) => s + r.count, 0),
  };

  function openEditor(c: CustomerRow | "new") {
    setErrors({});
    setForm(
      c === "new"
        ? emptyForm
        : { name: c.name, email: c.email, company: c.company ?? "", phone: c.phone ?? "", address: c.billing_address ?? "" },
    );
    setEditing(c);
  }

  const save = useMutation({
    mutationFn: async () => {
      const e: typeof errors = {};
      if (!form.name.trim()) e.name = "Name is required";
      if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address";
      setErrors(e);
      if (Object.keys(e).length) throw new Error("Please fix the highlighted fields");
      const row = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        billing_address: form.address.trim() || null,
      };
      if (editing && editing !== "new") {
        const { error } = await supabase.from("customers").update(row).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert({ ...row, business_id: business!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing === "new" ? "Customer added" : "Customer updated");
      setEditing(null);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (c: CustomerRow) => {
      const n = invoices.filter((i) => i.customer_id === c.id).length;
      if (n > 0) throw new Error(`${c.name} has ${n} invoice(s). Delete or reassign those invoices first.`);
      const { error } = await supabase.from("customers").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const view = viewId ? rows.find((r) => r.c.id === viewId) : undefined;
  const viewInvoices = view ? invoices.filter((i) => i.customer_id === view.c.id).sort((a, b) => b.issue_date.localeCompare(a.issue_date)) : [];
  const viewInvoiceIds = new Set(viewInvoices.map((i) => i.id));
  const viewPayments = payments.filter((p) => viewInvoiceIds.has(p.invoice_id));
  const invNumber = new Map(invoices.map((i) => [i.id, i.invoice_number]));

  const err = (k: "name" | "email") => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Everyone you bill, with what they’ve paid and what they owe.</p>
        </div>
        <Button onClick={() => openEditor("new")}>
          <Plus className="mr-1 h-4 w-4" /> Add customer
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Customers", value: String(totals.customers) },
          { label: "Total invoices", value: String(totals.invoices) },
          { label: "Total paid", value: money(totals.paid) },
          { label: "Outstanding balance", value: money(totals.due) },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <div className="text-sm text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-bold tracking-tight">{isLoading ? "…" : k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md px-3 py-1.5 font-medium ${filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, business, email, phone" className="pl-8" aria-label="Search customers" />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <p className="font-medium">{customers.length === 0 ? "No customers yet" : "No customers match"}</p>
                      {customers.length === 0 && (
                        <Button size="sm" onClick={() => openEditor("new")}>
                          Add your first customer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visible.map(({ c, count, paid, due, status }) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button className="text-left" onClick={() => setViewId(c.id)}>
                        <div className="font-medium hover:underline">{c.company || c.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.company ? `${c.name} · ` : ""}
                          {c.email}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right">{money(paid)}</TableCell>
                    <TableCell className="text-right">{money(due)}</TableCell>
                    <TableCell>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{status}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${c.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewId(c.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditor(c)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setToDelete(c)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Customer details */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.c.company || view.c.name}</DialogTitle>
                <DialogDescription>{view.c.company ? view.c.name : "Customer"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {view.c.email}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {view.c.phone ?? "—"}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="whitespace-pre-line">{view.c.billing_address ?? "—"}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Invoices", String(view.count)],
                  ["Total paid", money(view.paid)],
                  ["Outstanding", money(view.due)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground">{l}</div>
                    <div className="mt-0.5 text-lg font-bold">{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold">Invoices</h3>
                {viewInvoices.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No invoices for this customer yet.</p>
                ) : (
                  <ul className="mt-2 divide-y rounded-xl border">
                    {viewInvoices.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                        <span className="font-medium">{i.invoice_number}</span>
                        <span className="text-muted-foreground">due {formatDate(i.due_date)}</span>
                        <span className="ml-auto">{formatMoney(i.total, i.currency)}</span>
                        <StatusBadge invoice={i} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-semibold">Payment history</h3>
                {viewPayments.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <ul className="mt-2 divide-y rounded-xl border">
                    {viewPayments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                        <span className="text-muted-foreground">{formatDate(p.payment_date)}</span>
                        <span>{invNumber.get(p.invoice_id) ?? "—"}</span>
                        <span className="text-muted-foreground">{methodLabel(p.method)}</span>
                        <span className="ml-auto font-medium">{formatMoney(p.amount, p.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button asChild variant="outline">
                  <Link to="/app/create-invoice">
                    <FilePlus2 className="mr-2 h-4 w-4" /> New invoice
                  </Link>
                </Button>
                <Button
                  onClick={() => {
                    setViewId(null);
                    openEditor(view.c);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit customer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add customer" : "Edit customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name *</Label>
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
              {err("name")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-company">Business name</Label>
              <Input id="c-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email *</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
              {err("email")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone number</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-addr">Address</Label>
              <Textarea id="c-addr" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing === "new" ? "Add customer" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the customer record permanently. Customers who have invoices can’t be deleted until those invoices are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep customer</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const c = toDelete!;
                setToDelete(null);
                remove.mutate(c);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
