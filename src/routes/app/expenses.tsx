import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Copy, Database as DbIcon, Download, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";

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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv } from "@/lib/csv";
import { PAYMENT_METHODS, formatDate, formatMoney, round2, todayISO } from "@/lib/format";
import setupSql from "../../../supabase/migrations/20261030140000_create_expenses.sql?raw";

export const Route = createFileRoute("/app/expenses")({ component: Expenses });

interface Expense {
  id: string;
  business_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string;
}

// The expenses table isn't part of the generated database types, so talk to it through a narrow untyped handle.
type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as Db;

const CATEGORIES = ["Rent", "Salaries", "Software", "Marketing", "Travel", "Utilities", "Office supplies", "Taxes & fees", "Other"];
const COLORS = ["#059669", "#10B981", "#34D399", "#F59E0B", "#EF4444", "#6366F1", "#0EA5E9", "#A855F7", "#94A3B8"];
const PAGE_SIZE = 10;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const methodLabel = (v: string) => PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;

function isMissingTable(err: unknown) {
  const e = err as { code?: string; message?: string } | null;
  return !!e && (e.code === "42P01" || e.code === "PGRST205" || /expenses/.test(e.message ?? "") && /(does not exist|schema cache)/.test(e.message ?? ""));
}

const emptyForm = () => ({ category: "Software", amount: "", expense_date: todayISO(), payment_method: "bank_transfer", description: "" });

function Expenses() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const currency = business?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ["expenses", business?.id],
    enabled: !!business,
    retry: false,
    queryFn: async () => {
      const { data, error } = await db
        .from("expenses")
        .select("*")
        .eq("business_id", business!.id)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Expense[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["expenses", business?.id] });

  const save = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!(amount > 0)) throw new Error("Enter an amount greater than zero");
      if (!form.expense_date) throw new Error("Choose a date");
      const row = {
        category: form.category,
        amount: round2(amount),
        expense_date: form.expense_date,
        payment_method: form.payment_method,
        description: form.description.trim() || null,
      };
      if (editing && editing !== "new") {
        const { error } = await db.from("expenses").update(row).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("expenses").insert({ ...row, business_id: business!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing === "new" ? "Expense added" : "Expense updated");
      setEditing(null);
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense deleted");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEditor(e: Expense | "new") {
    setForm(
      e === "new"
        ? emptyForm()
        : {
            category: e.category,
            amount: String(e.amount),
            expense_date: e.expense_date,
            payment_method: e.payment_method,
            description: e.description ?? "",
          },
    );
    setEditing(e);
  }

  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastKey = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const sumFor = (list: Expense[]) => list.reduce((s, e) => s + e.amount, 0);
  const thisMonth = sumFor(expenses.filter((e) => e.expense_date.startsWith(thisKey)));
  const lastMonth = sumFor(expenses.filter((e) => e.expense_date.startsWith(lastKey)));
  const ytd = sumFor(expenses.filter((e) => e.expense_date.startsWith(String(now.getFullYear()))));
  const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const monthly = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: MONTHS[d.getMonth()]!, Expenses: round2(sumFor(expenses.filter((e) => e.expense_date.startsWith(key)))) };
  });
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses.filter((x) => x.expense_date.startsWith(thisKey))) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].map(([name, value]) => ({ name, value: round2(value) })).sort((a, b) => b.value - a.value);
  }, [expenses, thisKey]);

  const rows = expenses.filter((e) => {
    if (category !== "all" && e.category !== category) return false;
    const t = q.trim().toLowerCase();
    return !t || `${e.category} ${e.description ?? ""}`.toLowerCase().includes(t);
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const usedCategories = [...new Set([...CATEGORIES, ...expenses.map((e) => e.category)])];

  if (error && isMissingTable(error)) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <DbIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">One-time setup needed</h2>
              <p className="text-sm text-muted-foreground">
                Your database doesn’t have an expenses table yet. Run this SQL once, then reload this page.
              </p>
            </div>
          </div>
          <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-4 text-xs">{setupSql}</pre>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(setupSql).then(
                  () => toast.success("SQL copied"),
                  () => toast.error("Couldn't copy. Select the text and copy it manually"),
                );
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy SQL
            </Button>
            <Button variant="outline" onClick={() => void refresh()}>
              Check again
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            In Lovable, open the database / SQL editor for this project and paste it there. The same SQL is saved in the project at
            supabase/migrations/20261030140000_create_expenses.sql.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Record what the business spends and see where it goes.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                "expenses.csv",
                rows.map((e) => ({
                  Date: e.expense_date,
                  Category: e.category,
                  Description: e.description ?? "",
                  "Payment method": methodLabel(e.payment_method),
                  Amount: e.amount,
                })),
              )
            }
          >
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => openEditor("new")}>
            <Plus className="mr-1 h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "This month", value: money(thisMonth), hint: change === null ? "No spending last month" : `${change >= 0 ? "+" : ""}${change}% vs last month` },
          { label: "Last month", value: money(lastMonth), hint: "Previous calendar month" },
          { label: `Year to date (${now.getFullYear()})`, value: money(ytd), hint: `${expenses.length} expense(s) recorded` },
        ].map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-sm text-muted-foreground">{c.label}</div>
            {isLoading ? <Skeleton className="mt-2 h-9 w-36" /> : <div className="mt-2 text-3xl font-bold tracking-tight">{c.value}</div>}
            <div className="mt-1 text-xs text-muted-foreground">{c.hint}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Monthly expense summary</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  formatter={(v: number) => [money(Number(v)), "Expenses"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="Expenses" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">By category, this month</h2>
          {byCategory.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No expenses recorded this month.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {byCategory.map((c, i) => (
                        <Cell key={c.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [money(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {byCategory.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}: <span className="font-medium">{money(c.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-semibold">All expenses</h2>
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search description"
              className="pl-8"
              aria-label="Search expenses"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-md border bg-background px-2 text-sm"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {usedCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
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
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">{expenses.length === 0 ? "No expenses yet" : "No expenses match"}</p>
                      {expenses.length === 0 && (
                        <Button size="sm" onClick={() => openEditor("new")}>
                          Add your first expense
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.expense_date)}</TableCell>
                    <TableCell className="font-medium">{e.category}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{e.description ?? "—"}</TableCell>
                    <TableCell>{methodLabel(e.payment_method)}</TableCell>
                    <TableCell className="text-right font-medium">{money(e.amount)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" aria-label="Edit expense" onClick={() => openEditor(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete expense" onClick={() => setToDelete(e)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {rows.length > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {rows.length} expenses · page {safePage + 1} of {pageCount}
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add expense" : "Edit expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {usedCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-amount">Amount ({currency})</Label>
                <Input id="ex-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-date">Date</Label>
                <Input id="ex-date" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-desc">Description</Label>
              <Textarea id="ex-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing === "new" ? "Add expense" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && `${toDelete.category} · ${formatMoney(toDelete.amount, currency)} on ${formatDate(toDelete.expense_date)}. `}
              This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const id = toDelete!.id;
                setToDelete(null);
                remove.mutate(id);
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
