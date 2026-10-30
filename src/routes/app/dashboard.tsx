import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  AlertCircle,
  Lightbulb,
  Plus,
  Search,
  Send,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  daysBetween,
  effectiveStatus,
  formatDate,
  formatMoney,
  outstandingAmount,
  PAYMENT_METHODS,
  todayISO,
} from "@/lib/format";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">No data last month</span>;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={`flex items-center font-semibold ${up ? "text-success" : "text-destructive"}`}>
        <Icon className="h-3.5 w-3.5" />
        {Math.abs(Math.round(pct))}%
      </span>
      <span className="text-muted-foreground">vs last month</span>
    </span>
  );
}

function Dashboard() {
  const { business, profile } = useBusiness();
  const { data: invoices = [] } = useQuery({
    queryKey: ["dashboard", "invoices", business?.id],
    enabled: !!business,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(name)")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["dashboard", "payments", business?.id],
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

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [sort, setSort] = useState<"newest" | "due" | "amount">("newest");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  const currency = business?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);
  const today = todayISO();
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  const open = invoices.filter((i) => ["sent", "partially_paid"].includes(i.status));
  const overdue = invoices.filter((i) => effectiveStatus(i) === "overdue");
  const sum = (list: typeof invoices) => list.reduce((s, i) => s + outstandingAmount(i), 0);

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const paidIn = (key: string) =>
    payments.filter((p) => p.payment_date.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0);
  const paidThis = paidIn(thisMonth);
  const paidLast = paidIn(lastMonth);
  const paidTrend = paidLast > 0 ? ((paidThis - paidLast) / paidLast) * 100 : null;
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);

  const cards = [
    { label: "Total revenue", value: money(totalRevenue), icon: Coins, tone: "bg-success/15 text-success", trend: <Trend pct={paidTrend} /> },
    { label: "Outstanding", value: money(sum(open)), icon: Clock, tone: "bg-warning/15 text-warning", trend: <span className="text-xs text-muted-foreground">{open.length} open invoice(s)</span> },
    { label: "Overdue", value: money(sum(overdue)), icon: AlertCircle, tone: "bg-destructive/15 text-destructive", trend: <span className="text-xs text-muted-foreground">{overdue.length} overdue invoice(s)</span> },
    { label: "Paid this month", value: money(paidThis), icon: CheckCircle2, tone: "bg-success/15 text-success", trend: <Trend pct={paidTrend} /> },
  ];

  // Last 12 months: invoiced (bars) and collected (line).
  const months = Array.from({ length: 12 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - k), 1);
    const key = monthKey(d);
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      invoiced: invoices
        .filter((i) => i.status !== "cancelled" && i.issue_date.startsWith(key))
        .reduce((s, i) => s + Number(i.total), 0),
      collected: paidIn(key),
    };
  });
  const chartData = months.map((m) => ({ month: m.label, Revenue: m.collected, Invoices: m.invoiced }));
  const short = (v: number) => (v >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v));

  const filtered = invoices
    .filter((i) => {
      const st = effectiveStatus(i);
      if (statusFilter === "paid" && st !== "paid") return false;
      if (statusFilter === "pending" && !["sent", "partially_paid", "draft"].includes(st)) return false;
      if (statusFilter === "overdue" && st !== "overdue") return false;
      const t = q.trim().toLowerCase();
      return !t || `${i.invoice_number} ${i.customers?.name ?? ""}`.toLowerCase().includes(t);
    })
    .sort((a, b) =>
      sort === "due" ? a.due_date.localeCompare(b.due_date) : sort === "amount" ? Number(b.total) - Number(a.total) : 0,
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Payment methods breakdown for the donut.
  const METHOD_COLORS = ["stroke-primary", "stroke-violet-500", "stroke-lime-500", "stroke-orange-500", "stroke-sky-500", "stroke-muted-foreground"];
  const METHOD_DOTS = ["bg-primary", "bg-violet-500", "bg-lime-500", "bg-orange-500", "bg-sky-500", "bg-muted-foreground"];
  const methods = PAYMENT_METHODS.map((m) => ({
    label: m.label,
    amount: payments.filter((p) => p.method === m.value).reduce((s, p) => s + Number(p.amount), 0),
  }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const methodTotal = methods.reduce((s, m) => s + m.amount, 0);
  const R = 62;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = methods.map((m, i) => {
    const len = (m.amount / methodTotal) * C;
    const arc = { ...m, len, off: -acc, color: METHOD_COLORS[i % METHOD_COLORS.length]!, dot: METHOD_DOTS[i % METHOD_DOTS.length]! };
    acc += len;
    return arc;
  });

  // Activity feed: latest payments plus the most overdue invoice.
  const byId = new Map(invoices.map((i) => [i.id, i]));
  const activity = [
    ...payments.slice(0, 3).map((p) => {
      const inv = byId.get(p.invoice_id);
      return {
        key: p.id,
        tone: "text-success",
        icon: CheckCircle2,
        title: "Payment received",
        who: `${inv?.customers?.name ?? "—"}${inv ? ` · ${inv.invoice_number}` : ""}`,
        amount: money(Number(p.amount)),
        amountClass: "",
        date: p.payment_date,
      };
    }),
    ...overdue.slice(0, 1).map((inv) => ({
      key: `o-${inv.id}`,
      tone: "text-destructive",
      icon: AlertCircle,
      title: "Overdue",
      who: inv.customers?.name ?? inv.invoice_number,
      amount: money(outstandingAmount(inv)),
      amountClass: "text-destructive",
      date: inv.due_date,
    })),
  ];

  // Follow-up schedule: overdue first, then due today, then due within 3 days.
  const schedule = [
    ...overdue.map((inv) => ({ inv, kind: "overdue" as const })),
    ...open.filter((i) => i.due_date === today).map((inv) => ({ inv, kind: "today" as const })),
    ...open
      .filter((i) => i.due_date > today && daysBetween(today, i.due_date) <= 3)
      .map((inv) => ({ inv, kind: "soon" as const })),
  ].slice(0, 3);

  const tips = ["Create professional invoices", "Manage customer records", "Track payment status", "Automate overdue reminders"];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-muted-foreground">Here’s your business at a glance.</p>
        </div>
        <Link
          to="/app/create-invoice"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Create invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone, trend }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
            <div className="mt-2">{trend}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Revenue Overview</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Invoices (trend)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/30" /> Revenue
                </span>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={short} />
                  <Tooltip
                    formatter={(v: number, name: string) => [money(Number(v)), name]}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                  />
                  <Bar dataKey="Revenue" fill="var(--primary)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Invoices" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Payment Methods</h2>
            {methodTotal === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-8">
                <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90" role="img" aria-label="Payment methods donut chart">
                  {arcs.map((a) => (
                    <circle
                      key={a.label}
                      cx="80"
                      cy="80"
                      r={R}
                      fill="none"
                      strokeWidth="22"
                      className={a.color}
                      strokeDasharray={`${Math.max(a.len - 2, 0)} ${C}`}
                      strokeDashoffset={a.off}
                    />
                  ))}
                  <g className="rotate-90 origin-center">
                    <text x="80" y="84" textAnchor="middle" fontSize="13" fontWeight="700" className="fill-foreground">
                      {money(methodTotal)}
                    </text>
                  </g>
                </svg>
                <ul className="space-y-2 text-sm">
                  {arcs.map((a) => (
                    <li key={a.label} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-sm ${a.dot}`} />
                      {a.label} ({Math.round((a.amount / methodTotal) * 100)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Invoices</h2>
              <Link to="/app/invoices" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[160px] flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search invoice or customer"
                  className="h-9 pl-8"
                  aria-label="Search invoices"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setPage(0);
                }}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
                aria-label="Sort invoices"
              >
                <option value="newest">Newest first</option>
                <option value="due">Due date</option>
                <option value="amount">Highest amount</option>
              </select>
            </div>
            {filtered.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {invoices.length === 0 ? "No invoices yet. Create your first one." : "No invoices match your filters."}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="rounded-l-md px-3 py-2 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 font-medium">Due date</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="rounded-r-md px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pageRows.map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-3 font-medium">{i.invoice_number}</td>
                        <td className="px-3 py-3">{i.customers?.name ?? "—"}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDate(i.due_date)}</td>
                        <td className="px-3 py-3 text-right">{formatMoney(i.total, i.currency)}</td>
                        <td className="px-3 py-3">
                          <StatusBadge invoice={i} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link to="/app/invoices" search={{ q: i.invoice_number }} className="text-primary hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {filtered.length} invoice{filtered.length === 1 ? "" : "s"} · page {safePage + 1} of {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(safePage - 1)}
                      disabled={safePage === 0}
                      className="rounded-md border px-3 py-1.5 font-medium text-foreground disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(safePage + 1)}
                      disabled={safePage >= pageCount - 1}
                      className="rounded-md border px-3 py-1.5 font-medium text-foreground disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Payment Activity</h2>
              <Link to="/app/payments" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {activity.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="mt-3 divide-y">
                {activity.map(({ key, icon: Icon, tone, title, who, amount, amountClass, date }) => (
                  <div key={key} className="flex items-center gap-3 py-3 text-sm">
                    <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{title}</div>
                      <div className="truncate text-xs text-muted-foreground">{who}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${amountClass}`}>{amount}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Follow-up schedule</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Automate polite reminders and never miss a payment again.
            </p>
            {schedule.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nothing needs follow-up right now.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {schedule.map(({ inv, kind }, idx) => {
                  const late = Math.max(0, daysBetween(inv.due_date, today));
                  const copy =
                    kind === "overdue"
                      ? { title: "Overdue follow-up", pill: `${late} day${late === 1 ? "" : "s"} overdue`, pillClass: "bg-destructive/15 text-destructive", dot: "bg-destructive" }
                      : kind === "today"
                        ? { title: "Due today", pill: "Today", pillClass: "bg-warning/15 text-warning", dot: "bg-warning" }
                        : { title: "Friendly reminder", pill: `Due ${formatDate(inv.due_date)}`, pillClass: "bg-success/15 text-success", dot: "bg-success" };
                  return (
                    <li key={inv.id} className="flex gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${copy.dot}`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 text-sm">
                        <div className="font-medium">{copy.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {inv.invoice_number} · {inv.customers?.name ?? "—"} · {money(outstandingAmount(inv))}
                        </div>
                        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-medium ${copy.pillClass}`}>
                          {copy.pill}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <Link
              to="/app/reminders"
              className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Send className="h-4 w-4" /> Send reminder
            </Link>
          </Card>

          <Card className="bg-accent/50 p-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-success" />
              <h2 className="text-sm font-semibold">Stay on top of your payments</h2>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Track invoices, manage customers and let automation handle the follow-ups.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs">
              {tips.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
