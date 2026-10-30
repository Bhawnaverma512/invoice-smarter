import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Plus, Search, Wallet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDialog } from "@/components/payment-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  PAYMENT_METHODS,
  effectiveStatus,
  formatDate,
  formatMoney,
  outstandingAmount,
  type InvoiceRow,
} from "@/lib/format";

export const Route = createFileRoute("/app/payments")({ component: Payments });

type Inv = InvoiceRow & { customers: { name: string } | null };
const PAGE_SIZE = 10;
const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;

function Payments() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const currency = business?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);

  const [q, setQ] = useState("");
  const [method, setMethod] = useState("all");
  const [page, setPage] = useState(0);
  const [picker, setPicker] = useState(false);
  const [paying, setPaying] = useState<Inv | null>(null);

  const { data: payments = [], isLoading: loadingPay } = useQuery({
    queryKey: ["payments-page", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", business!.id)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: invoices = [], isLoading: loadingInv } = useQuery({
    queryKey: ["payments-invoices", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(name)")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Inv[];
    },
  });

  const byId = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const open = invoices
    .filter((i) => ["sent", "partially_paid"].includes(i.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const overdue = open.filter((i) => effectiveStatus(i) === "overdue");
  const received = payments.reduce((s, p) => s + Number(p.amount), 0);
  const pendingAmount = open.reduce((s, i) => s + outstandingAmount(i), 0);
  const overdueAmount = overdue.reduce((s, i) => s + outstandingAmount(i), 0);

  const rows = payments.filter((p) => {
    if (method !== "all" && p.method !== method) return false;
    const inv = byId.get(p.invoice_id);
    const t = q.trim().toLowerCase();
    return (
      !t ||
      `${inv?.customers?.name ?? ""} ${inv?.invoice_number ?? ""} ${p.reference ?? ""}`.toLowerCase().includes(t)
    );
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const cards = [
    { label: "Total received", value: money(received), hint: `${payments.length} payment(s)`, icon: CheckCircle2, tone: "bg-success/15 text-success" },
    { label: "Pending payments", value: money(pendingAmount), hint: `${open.length} open invoice(s)`, icon: Clock, tone: "bg-warning/15 text-warning" },
    { label: "Overdue payments", value: money(overdueAmount), hint: `${overdue.length} overdue invoice(s)`, icon: AlertCircle, tone: "bg-destructive/15 text-destructive" },
  ];

  const loading = loadingPay || loadingInv;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track money received and what is still owed.</p>
        </div>
        <Button onClick={() => setPicker(true)} disabled={open.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Record payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, hint, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            {loading ? <Skeleton className="mt-3 h-9 w-40" /> : <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>}
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h2 className="font-semibold">Payment history</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search customer, invoice, reference"
                className="pl-8"
                aria-label="Search payments"
              />
            </div>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(0);
              }}
              className="h-10 rounded-md border bg-background px-2 text-sm"
              aria-label="Filter by payment method"
            >
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Invoice status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <Wallet className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium">{payments.length === 0 ? "No payments recorded yet" : "No payments match"}</p>
                        <p className="text-sm text-muted-foreground">
                          {payments.length === 0
                            ? "When a customer pays, record it here or from the Invoices page."
                            : "Try a different search or method."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((p) => {
                    const inv = byId.get(p.invoice_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.payment_date)}</TableCell>
                        <TableCell className="font-medium">{inv?.customers?.name ?? "—"}</TableCell>
                        <TableCell>{inv?.invoice_number ?? "—"}</TableCell>
                        <TableCell>
                          <div>{methodLabel(p.method)}</div>
                          {p.reference && <div className="text-xs text-muted-foreground">Ref: {p.reference}</div>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(p.amount, p.currency)}</TableCell>
                        <TableCell>{inv ? <StatusBadge invoice={inv} /> : "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {rows.length > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {rows.length} payments · page {safePage + 1} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="h-fit p-5">
          <h2 className="font-semibold">Awaiting payment</h2>
          <p className="text-xs text-muted-foreground">Oldest due date first</p>
          {open.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing outstanding. All caught up!</p>
          ) : (
            <ul className="mt-3 divide-y">
              {open.slice(0, 8).map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{i.customers?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.invoice_number} · due {formatDate(i.due_date)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-semibold">{formatMoney(outstandingAmount(i), i.currency)}</span>
                      <StatusBadge invoice={i} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setPaying(i)}>
                    Record
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Choose the invoice this payment is for.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y">
            {open.map((i) => (
              <li key={i.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-3 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setPicker(false);
                    setPaying(i);
                  }}
                >
                  <span>
                    <span className="block font-medium">{i.customers?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.invoice_number} · due {formatDate(i.due_date)}
                    </span>
                  </span>
                  <span className="font-semibold">{formatMoney(outstandingAmount(i), i.currency)}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        invoice={paying}
        open={!!paying}
        onOpenChange={(o) => !o && setPaying(null)}
        onRecorded={() => void qc.invalidateQueries()}
      />
    </div>
  );
}
