import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  Download,
  Eye,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Printer,
  Search,
  Send,
  Trash2,
  Wallet,
} from "lucide-react";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceDocument, printInvoice, type InvoiceDoc } from "@/components/invoice-document";
import { PaymentDialog } from "@/components/payment-dialog";
import { StatusBadge } from "@/components/status-badge";
import { effectiveStatus, formatDate, formatMoney, outstandingAmount, type InvoiceRow } from "@/lib/format";
import { cancelInvoice, deleteInvoice, invoiceMailto, markInvoiceSent, totalsFor } from "@/lib/invoices";

export const Route = createFileRoute("/app/invoices")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {},
  component: Invoices,
});

type Row = InvoiceRow & { customers: { name: string; email: string; company: string | null; phone: string | null; billing_address: string | null } | null };
type Filter = "all" | "paid" | "pending" | "overdue" | "draft";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "draft", label: "Drafts" },
];
const PAGE_SIZE = 10;

function Invoices() {
  const { q: urlQ = "" } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { business } = useBusiness();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<{ row: Row; doc: InvoiceDoc } | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [toCancel, setToCancel] = useState<Row | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["invoices-page", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(name, email, company, phone, billing_address)")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const refresh = () => qc.invalidateQueries();
  const currency = business?.currency ?? "USD";

  const visible = useMemo(() => {
    const t = urlQ.trim().toLowerCase();
    return rows.filter((r) => {
      const st = effectiveStatus(r);
      if (filter === "paid" && st !== "paid") return false;
      if (filter === "pending" && !["sent", "partially_paid"].includes(st)) return false;
      if (filter === "overdue" && st !== "overdue") return false;
      if (filter === "draft" && st !== "draft") return false;
      return !t || `${r.invoice_number} ${r.customers?.name ?? ""} ${r.customers?.email ?? ""}`.toLowerCase().includes(t);
    });
  }, [rows, filter, urlQ]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const counts = {
    all: rows.length,
    paid: rows.filter((r) => effectiveStatus(r) === "paid").length,
    pending: rows.filter((r) => ["sent", "partially_paid"].includes(effectiveStatus(r))).length,
    overdue: rows.filter((r) => effectiveStatus(r) === "overdue").length,
    draft: rows.filter((r) => r.status === "draft").length,
  };

  async function buildDoc(r: Row): Promise<InvoiceDoc> {
    const { data: items, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", r.id)
      .order("position");
    if (error) throw error;
    const lines = (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));
    const t = totalsFor({
      items: lines,
      tax_rate: Number(r.tax_rate),
      discount_type: r.discount_type as "none" | "percentage" | "fixed",
      discount_value: Number(r.discount_value),
    });
    return {
      business: {
        name: business?.name ?? "",
        address: business?.address ?? null,
        email: business?.email ?? null,
        phone: business?.phone ?? null,
        tax_id: business?.tax_id ?? null,
        payment_instructions: r.payment_instructions ?? business?.payment_instructions ?? null,
        logo_url: business?.logo_url ?? null,
      },
      customer: {
        name: r.customers?.name ?? "Customer",
        company: r.customers?.company ?? null,
        email: r.customers?.email ?? "",
        phone: r.customers?.phone ?? null,
        billing_address: r.customers?.billing_address ?? null,
      },
      number: r.invoice_number,
      status: effectiveStatus(r),
      issue_date: r.issue_date,
      due_date: r.due_date,
      currency: r.currency,
      items: lines,
      subtotal: t.subtotal,
      discount: t.discount,
      tax: t.tax,
      tax_rate: Number(r.tax_rate),
      total: Number(r.total),
      paid_amount: Number(r.paid_amount),
      notes: r.notes,
    };
  }

  async function run(r: Row, fn: () => Promise<void>) {
    setBusyId(r.id);
    try {
      await fn();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const view = (r: Row) => run(r, async () => setDetail({ row: r, doc: await buildDoc(r) }));
  const print = (r: Row) => run(r, async () => printInvoice(await buildDoc(r)));
  const send = (r: Row) =>
    run(r, async () => {
      if (!r.customers?.email) throw new Error("This customer has no email address");
      if (r.status === "cancelled") throw new Error("Cancelled invoices can't be sent");
      const scheduled = await markInvoiceSent(r);
      await refresh();
      toast.success(`${r.invoice_number} marked as sent${scheduled ? ` · ${scheduled} reminder(s) scheduled` : ""}`);
      window.location.href = invoiceMailto({
        to: r.customers.email,
        customerName: r.customers.name,
        number: r.invoice_number,
        amount: Number(r.total),
        currency: r.currency,
        dueDate: r.due_date,
        businessName: business?.name ?? "",
        paymentInstructions: r.payment_instructions ?? business?.payment_instructions,
      });
    });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">View, send and manage every invoice.</p>
        </div>
        <Button asChild>
          <Link to="/app/create-invoice">
            <FilePlus2 className="mr-1 h-4 w-4" /> Create invoice
          </Link>
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap rounded-lg bg-muted p-0.5 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setPage(0);
                }}
                className={`rounded-md px-3 py-1.5 font-medium ${filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {f.label} <span className="ml-1 text-xs opacity-70">{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={urlQ}
              onChange={(e) => {
                setPage(0);
                void navigate({ to: "/app/invoices", search: e.target.value ? { q: e.target.value } : {}, replace: true });
              }}
              placeholder="Search number, customer, email"
              className="pl-8"
              aria-label="Search invoices"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <FilePlus2 className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">{rows.length === 0 ? "No invoices yet" : "No invoices match"}</p>
                      <p className="text-sm text-muted-foreground">
                        {rows.length === 0 ? "Create your first invoice to get started." : "Try a different filter or search."}
                      </p>
                      {rows.length === 0 && (
                        <Button asChild size="sm" className="mt-2">
                          <Link to="/app/create-invoice">Create invoice</Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => (
                  <TableRow key={r.id} className={busyId === r.id ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{r.invoice_number}</TableCell>
                    <TableCell>
                      <div>{r.customers?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.customers?.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.issue_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.due_date)}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.total, r.currency)}</TableCell>
                    <TableCell className="text-right">
                      {r.status === "cancelled" ? "—" : formatMoney(outstandingAmount(r), r.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge invoice={r} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${r.invoice_number}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => view(r)}>
                            <Eye className="mr-2 h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/app/create-invoice" search={{ edit: r.id }}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          {r.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => send(r)}>
                              <Send className="mr-2 h-4 w-4" /> {r.status === "draft" ? "Send invoice" : "Resend"}
                            </DropdownMenuItem>
                          )}
                          {["sent", "partially_paid"].includes(r.status) && (
                            <DropdownMenuItem onClick={() => setPaying(r)}>
                              <Wallet className="mr-2 h-4 w-4" /> Record payment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => print(r)}>
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => print(r)}>
                            <Printer className="mr-2 h-4 w-4" /> Print
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {r.status !== "cancelled" && r.status !== "paid" && (
                            <DropdownMenuItem onClick={() => setToCancel(r)}>
                              <Ban className="mr-2 h-4 w-4" /> Cancel invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setToDelete(r)} className="text-destructive focus:text-destructive">
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

        {visible.length > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {visible.length} invoices · page {safePage + 1} of {pageCount}
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.row.invoice_number}</DialogTitle>
          </DialogHeader>
          {detail && <InvoiceDocument doc={detail.doc} />}
          {detail && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => printInvoice(detail.doc)}>
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/create-invoice" search={{ edit: detail.row.id }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              {detail.row.status !== "cancelled" && (
                <Button onClick={() => send(detail.row)}>
                  <Send className="mr-2 h-4 w-4" /> {detail.row.status === "draft" ? "Send invoice" : "Resend"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice, its line items and its scheduled reminders. This can’t be undone.
              {Number(toDelete?.paid_amount ?? 0) > 0 && " This invoice has recorded payments, so it can’t be deleted. Cancel it instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const r = toDelete!;
                setToDelete(null);
                void run(r, async () => {
                  await deleteInvoice(r);
                  await refresh();
                  toast.success(`${r.invoice_number} deleted`);
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {toCancel?.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice stays in your records but is marked Cancelled and its reminders stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const r = toCancel!;
                setToCancel(null);
                void run(r, async () => {
                  await cancelInvoice(r.id);
                  await refresh();
                  toast.success(`${r.invoice_number} cancelled`);
                });
              }}
            >
              Cancel invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentDialog
        invoice={paying ? { ...paying, currency: paying.currency || currency } : null}
        open={!!paying}
        onOpenChange={(o) => !o && setPaying(null)}
        onRecorded={() => void refresh()}
      />
    </div>
  );
}
