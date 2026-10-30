import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Clock, Coins, Download, FileDown, Percent } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import {
  daysBetween,
  effectiveStatus,
  formatDate,
  formatMoney,
  outstandingAmount,
  round2,
  todayISO,
  type InvoiceRow,
} from "@/lib/format";

export const Route = createFileRoute("/app/reports")({ component: Reports });

type Inv = InvoiceRow & { customers: { name: string } | null };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 };

function ExportCsv({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} className="no-print">
      <Download className="mr-1 h-3.5 w-3.5" /> CSV
    </Button>
  );
}

function Reports() {
  const { business } = useBusiness();
  const currency = business?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const { data: invoices = [], isLoading: l1 } = useQuery({
    queryKey: ["reports-invoices", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*, customers(name)").eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Inv[];
    },
  });
  const { data: payments = [], isLoading: l2 } = useQuery({
    queryKey: ["reports-payments", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("business_id", business!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const loading = l1 || l2;

  const d = useMemo(() => {
    const live = invoices.filter((i) => i.status !== "cancelled" && i.status !== "draft");
    const inYear = live.filter((i) => i.issue_date.startsWith(String(year)));
    const payYear = payments.filter((p) => p.payment_date.startsWith(String(year)));

    const monthly = MONTHS.map((label, idx) => {
      const key = `${year}-${String(idx + 1).padStart(2, "0")}`;
      return {
        month: label,
        Revenue: round2(payments.filter((p) => p.payment_date.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0)),
        Invoiced: round2(live.filter((i) => i.issue_date.startsWith(key)).reduce((s, i) => s + Number(i.total), 0)),
      };
    });

    const yearly = Array.from({ length: 5 }, (_, k) => {
      const y = thisYear - 4 + k;
      return {
        year: String(y),
        Revenue: round2(payments.filter((p) => p.payment_date.startsWith(String(y))).reduce((s, p) => s + Number(p.amount), 0)),
      };
    });

    const invoicedYear = inYear.reduce((s, i) => s + Number(i.total), 0);
    const collectedYear = payYear.reduce((s, p) => s + Number(p.amount), 0);
    const open = invoices.filter((i) => ["sent", "partially_paid"].includes(i.status));
    const outstanding = open.reduce((s, i) => s + outstandingAmount(i), 0);
    const overdue = open.filter((i) => effectiveStatus(i) === "overdue");

    const paidAmt = inYear.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
    const overdueAmt = inYear.filter((i) => effectiveStatus(i) === "overdue").reduce((s, i) => s + outstandingAmount(i), 0);
    const partAmt = inYear.filter((i) => effectiveStatus(i) === "partially_paid").reduce((s, i) => s + Number(i.paid_amount), 0);
    const split = [
      { name: "Paid", value: round2(paidAmt + partAmt), color: "#10B981" },
      {
        name: "Unpaid",
        value: round2(
          inYear
            .filter((i) => ["sent", "partially_paid"].includes(effectiveStatus(i)))
            .reduce((s, i) => s + outstandingAmount(i), 0),
        ),
        color: "#F59E0B",
      },
      { name: "Overdue", value: round2(overdueAmt), color: "#EF4444" },
    ].filter((s) => s.value > 0);

    // Customer payment performance (all time).
    const lastPay = new Map<string, string>();
    for (const p of payments) {
      const cur = lastPay.get(p.invoice_id);
      if (!cur || p.payment_date > cur) lastPay.set(p.invoice_id, p.payment_date);
    }
    const perf = new Map<string, { name: string; count: number; invoiced: number; paid: number; due: number; days: number[]; onTime: number; settled: number }>();
    for (const i of live) {
      const key = i.customer_id;
      const row = perf.get(key) ?? { name: i.customers?.name ?? "—", count: 0, invoiced: 0, paid: 0, due: 0, days: [], onTime: 0, settled: 0 };
      row.count += 1;
      row.invoiced += Number(i.total);
      row.paid += Number(i.paid_amount);
      row.due += outstandingAmount(i);
      const lp = lastPay.get(i.id);
      if (i.status === "paid" && lp) {
        row.settled += 1;
        row.days.push(daysBetween(i.issue_date, lp));
        if (lp <= i.due_date) row.onTime += 1;
      }
      perf.set(key, row);
    }
    const customers = [...perf.values()]
      .map((r) => ({
        name: r.name,
        invoices: r.count,
        invoiced: round2(r.invoiced),
        paid: round2(r.paid),
        outstanding: round2(r.due),
        avgDays: r.days.length ? Math.round(r.days.reduce((a, b) => a + b, 0) / r.days.length) : null,
        onTimePct: r.settled ? Math.round((r.onTime / r.settled) * 100) : null,
      }))
      .sort((a, b) => b.outstanding - a.outstanding);

    const today = todayISO();
    const overdueRows = overdue
      .map((i) => ({
        invoice: i.invoice_number,
        customer: i.customers?.name ?? "—",
        due: i.due_date,
        days: daysBetween(i.due_date, today),
        balance: outstandingAmount(i),
      }))
      .sort((a, b) => b.days - a.days);

    const years = Array.from(
      new Set([thisYear, ...invoices.map((i) => Number(i.issue_date.slice(0, 4))), ...payments.map((p) => Number(p.payment_date.slice(0, 4)))]),
    ).sort((a, b) => b - a);

    return {
      monthly, yearly, invoicedYear, collectedYear, outstanding, overdue, split, customers, overdueRows, years,
      rate: invoicedYear > 0 ? Math.round((collectedYear / invoicedYear) * 100) : 0,
      yearInvoiceCount: inYear.length,
    };
  }, [invoices, payments, year, thisYear]);

  function exportPdf() {
    document.body.classList.add("printing-report");
    const done = () => {
      document.body.classList.remove("printing-report");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 100);
  }
  function csv(name: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      toast.info("Nothing to export yet");
      return;
    }
    downloadCsv(`${name}-${year}.csv`, rows);
  }

  const kpis = [
    { label: `Revenue collected (${year})`, value: money(d.collectedYear), icon: Coins, tone: "bg-success/15 text-success" },
    { label: `Invoiced (${year})`, value: money(d.invoicedYear), hint: `${d.yearInvoiceCount} invoice(s)`, icon: FileDown, tone: "bg-accent text-accent-foreground" },
    { label: "Outstanding balance", value: money(d.outstanding), hint: "All open invoices", icon: Clock, tone: "bg-warning/15 text-warning" },
    { label: "Collection rate", value: `${d.rate}%`, hint: `Collected ÷ invoiced, ${year}`, icon: Percent, tone: "bg-success/15 text-success" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {business?.name} · generated {formatDate(todayISO())}
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-md border bg-background px-3 text-sm"
            aria-label="Report year"
          >
            {d.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button onClick={exportPdf}>
            <FileDown className="mr-1 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            {loading ? <Skeleton className="mt-3 h-9 w-36" /> : <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>}
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Monthly revenue, {year}</h2>
          <ExportCsv onClick={() => csv("monthly-revenue", d.monthly.map((m) => ({ Month: m.month, Revenue: m.Revenue, Invoiced: m.Invoiced })))} />
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip formatter={(v: number, n: string) => [money(Number(v)), n]} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="Revenue" fill="#059669" fillOpacity={0.35} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Invoiced" stroke="#047857" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Yearly revenue</h2>
            <ExportCsv onClick={() => downloadCsv("yearly-revenue.csv", d.yearly.map((y) => ({ Year: y.year, Revenue: y.Revenue })))} />
          </div>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.yearly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [money(Number(v)), "Revenue"]} contentStyle={tooltipStyle} />
                <Bar dataKey="Revenue" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Paid vs unpaid, {year}</h2>
            <ExportCsv onClick={() => csv("paid-vs-unpaid", d.split.map((s) => ({ Status: s.name, Amount: s.value })))} />
          </div>
          {d.split.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No sent invoices in {year}.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
              <div className="h-52 w-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.split} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {d.split.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [money(Number(v)), n]} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm">
                {d.split.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.name}: <span className="font-medium">{money(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Customer payment performance</h2>
            <p className="text-xs text-muted-foreground">All time · average days from invoice date to final payment</p>
          </div>
          <ExportCsv
            onClick={() =>
              downloadCsv(
                "customer-performance.csv",
                d.customers.map((c) => ({
                  Customer: c.name,
                  Invoices: c.invoices,
                  Invoiced: c.invoiced,
                  Paid: c.paid,
                  Outstanding: c.outstanding,
                  "Avg days to pay": c.avgDays ?? "",
                  "Paid on time %": c.onTimePct ?? "",
                })),
              )
            }
            disabled={d.customers.length === 0}
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Avg days to pay</TableHead>
                <TableHead className="text-right">Paid on time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No invoice data yet.
                  </TableCell>
                </TableRow>
              ) : (
                d.customers.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.invoices}</TableCell>
                    <TableCell className="text-right">{money(c.invoiced)}</TableCell>
                    <TableCell className="text-right">{money(c.paid)}</TableCell>
                    <TableCell className="text-right">{money(c.outstanding)}</TableCell>
                    <TableCell className="text-right">{c.avgDays === null ? "—" : `${c.avgDays} d`}</TableCell>
                    <TableCell className="text-right">{c.onTimePct === null ? "—" : `${c.onTimePct}%`}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold">Overdue invoice report</h2>
          </div>
          <ExportCsv
            onClick={() =>
              downloadCsv(
                "overdue-invoices.csv",
                d.overdueRows.map((r) => ({ Invoice: r.invoice, Customer: r.customer, "Due date": r.due, "Days overdue": r.days, Balance: r.balance })),
              )
            }
            disabled={d.overdueRows.length === 0}
          />
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Days overdue</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.overdueRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No overdue invoices. 🎉
                  </TableCell>
                </TableRow>
              ) : (
                d.overdueRows.map((r) => (
                  <TableRow key={r.invoice}>
                    <TableCell className="font-medium">{r.invoice}</TableCell>
                    <TableCell>{r.customer}</TableCell>
                    <TableCell>{formatDate(r.due)}</TableCell>
                    <TableCell className="text-right text-destructive">{r.days}</TableCell>
                    <TableCell className="text-right font-medium">{money(r.balance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
