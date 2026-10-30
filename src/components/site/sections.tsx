import { Link } from "@tanstack/react-router";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileDown,
  FileText,
  Mic,
  Percent,
  Phone,
  Quote,
  Receipt,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HeroArt } from "@/components/site/hero-art";
import { BENEFITS, FAQS, FEATURES, PLANS, STEPS, TESTIMONIALS, voiceAgentPhone } from "@/lib/site-content";
import { InvoiceDocument, type InvoiceDoc } from "@/components/invoice-document";
import { computeInvoiceTotals, formatMoney } from "@/lib/format";
import { useSignedIn } from "@/lib/use-session";

const ICONS: Record<(typeof FEATURES)[number]["id"], LucideIcon> = {
  invoice: FileText,
  voice: Mic,
  customers: Users,
  payments: CreditCard,
  reminders: BellRing,
  automation: Workflow,
  analytics: BarChart3,
  pdf: FileDown,
};

export function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <div className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</div>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Hero() {
  const { signedIn } = useSignedIn();
  const phone = voiceAgentPhone();
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-accent-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Invoicing, payments and follow-ups in one place
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Create Invoices Smarter. <span className="text-primary">Get Paid Faster.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Manage invoices, track payments, and automate customer follow-ups — all from one intelligent platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={signedIn ? "/app/dashboard" : "/signup"}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90"
            >
              {signedIn ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/" hash="features" className="rounded-xl border bg-white px-6 py-3 font-semibold hover:bg-accent">
              Explore Features
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Free plan available. No payment details needed to start.</p>
          {phone && (
            <a
              href={phone.href}
              className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Phone className="h-5 w-5" />
              </span>
              <span className="text-left">
                <span className="block text-xs font-medium text-muted-foreground">Talk to our voice agent</span>
                <span className="block text-base font-bold tracking-tight">{phone.label}</span>
              </span>
            </a>
          )}
        </div>
        <div className="mx-auto w-full max-w-xl lg:max-w-none">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Features" title="Everything Your Business Needs to Get Paid" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => {
          const Icon = ICONS[f.id];
          return (
            <div key={f.id} className="group rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-sky-100 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-emerald-50/50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="How It Works" title="From voice to paid in three steps" />
        <img
          src="/how-it-works.webp"
          alt="Speak your command, get an instant invoice, then send reminders and follow-ups"
          loading="lazy"
          className="mx-auto mt-12 w-full max-w-5xl rounded-2xl bg-white shadow-xl"
          // The artwork is blue; rotate its hue to the site's emerald green. Whites and greys are unaffected.
          style={{ filter: "hue-rotate(-62deg) saturate(1.1)" }}
        />
        <ol className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {s.n}
              </span>
              <span>
                <span className="block font-semibold">{s.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const money = (n: number) => formatMoney(n, "INR");
const PREVIEW_CHART = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => ({
  month,
  Revenue: [18, 25, 29, 27, 33, 31, 42, 40, 47, 45, 52, 58][i]! * 1000,
  Invoices: [22, 28, 33, 30, 38, 36, 46, 44, 50, 49, 56, 63][i]! * 1000,
}));
const PREVIEW_BADGE = { Paid: "bg-emerald-100 text-emerald-700", Pending: "bg-amber-100 text-amber-700", Overdue: "bg-red-100 text-red-700" } as const;

export function DashboardPreviewSection() {
  const { signedIn } = useSignedIn();
  const stats = [
    { label: "Total Revenue", value: money(248500), icon: Coins, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Outstanding Payments", value: money(42800), icon: Clock, tone: "bg-amber-100 text-amber-700" },
    { label: "Overdue Payments", value: money(12400), icon: AlertCircle, tone: "bg-red-100 text-red-700" },
    { label: "Paid This Month", value: money(186300), icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
  ];
  const invoices = [
    ["INV-1046", "Acme Studios", money(48000), "Paid"],
    ["INV-1045", "Bright Media", money(32500), "Pending"],
    ["INV-1042", "Nova Digital", money(12400), "Overdue"],
  ] as const;
  return (
    <section id="dashboard-preview" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Dashboard"
        title="See your whole business at a glance"
        sub="A preview of the application dashboard, shown with sample data."
      />
      <div className="mt-10 rounded-3xl border bg-slate-50 p-3 shadow-2xl sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="text-sm font-semibold">Revenue Chart</div>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={PREVIEW_CHART} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number, n: string) => [money(Number(v)), n]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="Revenue" fill="#059669" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Invoices" stroke="#059669" strokeWidth={2.5} dot={{ r: 2.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold">Follow-Up Schedule</div>
            <ol className="mt-3 space-y-3 text-sm">
              {[
                ["Friendly reminder", "3 days before due date", "bg-emerald-600"],
                ["Due today", "INV-1038 · Summit Digital", "bg-amber-500"],
                ["Overdue follow-up", "INV-1042 · 5 days overdue", "bg-red-500"],
              ].map(([t, d, c], i) => (
                <li key={t} className="flex gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${c}`}>{i + 1}</span>
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="text-xs text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="text-sm font-semibold">Recent Invoices</div>
            <div className="mt-2 divide-y text-sm">
              {invoices.map(([no, who, amt, st]) => (
                <div key={no} className="flex items-center gap-3 py-2.5">
                  <span className="font-medium">{no}</span>
                  <span className="text-muted-foreground">{who}</span>
                  <span className="ml-auto">{amt}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${PREVIEW_BADGE[st]}`}>{st}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold">Payment Activity</div>
            <div className="mt-2 divide-y text-sm">
              {[
                ["Payment received", "Acme Studios", money(48000)],
                ["Payment received", "Bright Media", money(32500)],
                ["Overdue", "Nova Digital", money(12400)],
              ].map(([t, who, amt]) => (
                <div key={`${t}${who}`} className="flex items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="text-xs text-muted-foreground">{who}</span>
                  </span>
                  <span className={`font-semibold ${t === "Overdue" ? "text-red-600" : ""}`}>{amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link
          to={signedIn ? "/app/dashboard" : "/signup"}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90"
        >
          Explore Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

const SAMPLE_ITEMS = [
  { description: "Website design (5 pages)", quantity: 1, unit_price: 30000 },
  { description: "Logo and brand kit", quantity: 1, unit_price: 12000 },
  { description: "Support hours", quantity: 6, unit_price: 1500 },
];
const SAMPLE_TOTALS = computeInvoiceTotals({
  items: SAMPLE_ITEMS.map((i) => ({ ...i, tax_rate: 0 })),
  discount_type: "percentage",
  discount_value: 10,
  tax_rate: 18,
});
const SAMPLE_INVOICE: InvoiceDoc = {
  business: {
    name: "Your Business Name",
    address: "12 MG Road, Bengaluru 560001",
    email: "billing@yourbusiness.example",
    phone: "+91 98765 43210",
    tax_id: "27ABCDE1234F1Z5",
    payment_instructions: "Bank transfer: HDFC Bank, A/C 0000 1234 5678, IFSC HDFC0001234\nUPI: yourbusiness@upi",
  },
  customer: {
    name: "Priya Sharma",
    company: "Acme Studios",
    email: "accounts@acme-studios.example",
    phone: "+91 91234 56780",
    billing_address: "45 Linking Road, Mumbai 400050",
  },
  number: "INV-0042",
  status: "partially_paid",
  issue_date: "2026-10-01",
  due_date: "2026-10-15",
  currency: "INR",
  items: SAMPLE_ITEMS,
  subtotal: SAMPLE_TOTALS.subtotal,
  discount: SAMPLE_TOTALS.discount,
  tax: SAMPLE_TOTALS.tax,
  tax_rate: 18,
  total: SAMPLE_TOTALS.total,
  paid_amount: 30000,
  notes: "Thank you for your business. Please quote the invoice number when paying.",
};

const INVOICE_DETAILS = [
  { icon: Receipt, title: "Automatic invoice numbers", body: "Every invoice gets the next number in your own format, like INV-0042, so nothing is duplicated." },
  { icon: Users, title: "Customer details", body: "Name, business, email, phone and billing address, filled in from your customer list." },
  { icon: Percent, title: "GST and discounts", body: "Set your GST rate and a percentage or fixed discount. The subtotal, tax and grand total update as you type." },
  { icon: CreditCard, title: "Payment instructions", body: "Bank details or a UPI ID printed on every invoice, so customers know exactly how to pay." },
  { icon: Coins, title: "Payments and balance", body: "Record full or part payments. The invoice shows what has been paid and what is still due." },
  { icon: BellRing, title: "Reminders attached", body: "Each unpaid invoice is followed up automatically, and reminders stop once it is paid." },
  { icon: FileDown, title: "PDF and print", body: "Download a clean PDF with your logo and GST number, or print it straight from the browser." },
] as const;

const STATUS_FLOW = [
  { label: "Draft", cls: "bg-slate-100 text-slate-700" },
  { label: "Sent", cls: "bg-sky-100 text-sky-700" },
  { label: "Partially paid", cls: "bg-amber-100 text-amber-700" },
  { label: "Paid", cls: "bg-emerald-100 text-emerald-700" },
  { label: "Overdue", cls: "bg-red-100 text-red-700" },
];

export function InvoiceDetailSection() {
  return (
    <section id="invoice-details" className="bg-emerald-50/50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Invoice details"
          title="Every invoice has everything in it"
          sub="A real invoice from the app, shown with sample details. Yours carries your own business name, logo and GST number."
        />
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border bg-white shadow-xl">
              <InvoiceDocument doc={SAMPLE_INVOICE} />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Sample invoice with 10% discount and 18% GST, partly paid.
            </p>
          </div>
          <div>
            <ul className="space-y-5">
              {INVOICE_DETAILS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-2xl border bg-white p-5">
              <div className="text-sm font-semibold">Status tracking</div>
              <p className="mt-1 text-xs text-muted-foreground">Overdue is worked out automatically from the due date.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {STATUS_FLOW.map((s, i) => (
                  <span key={s.label} className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    {i < STATUS_FLOW.length - 2 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BenefitsSection() {
  return (
    <section className="bg-emerald-50/50 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading title="Why Choose Smart Invoice & Follow-Up?" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-3 rounded-2xl border bg-white p-5 shadow-sm">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
              <span className="font-medium">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Pricing" title="Simple, transparent pricing" sub="Start free. Paid plans are not charged yet: online payments are switched on once a payment gateway is connected." />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl border bg-white p-7 ${p.featured ? "border-primary shadow-2xl shadow-primary/15 md:-translate-y-2" : "shadow-sm"}`}
          >
            {p.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-3">
              <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
              <span className="text-muted-foreground">{p.period}</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {perk}
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                p.featured ? "bg-primary text-primary-foreground hover:opacity-90" : "border hover:bg-accent"
              }`}
            >
              {p.price === "Free" ? "Get Started Free" : `Choose ${p.name}`}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-emerald-50/50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Testimonials" title="What businesses say" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="rounded-2xl border bg-white p-6 shadow-sm">
              <Quote className="h-6 w-6 text-primary/40" />
              <blockquote className="mt-3 text-sm">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="text-muted-foreground"> · {t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sample testimonials for illustration. They are not verified customer reviews.
        </p>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
      <Accordion type="single" collapsible className="mt-8 rounded-2xl border bg-white px-5">
        {FAQS.map((f, i) => (
          <AccordionItem key={f.q} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function CtaBand() {
  const { signedIn } = useSignedIn();
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-14 text-center text-white shadow-xl">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to get paid faster?</h2>
        <p className="mx-auto mt-3 max-w-xl text-emerald-50">Create your free account and send your first invoice in minutes.</p>
        <Link
          to={signedIn ? "/app/dashboard" : "/signup"}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          {signedIn ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
