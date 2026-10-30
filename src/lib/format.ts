import type { Database } from "@/integrations/supabase/types";

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type InvoiceItemRow = Database["public"]["Tables"]["invoice_items"]["Row"];
export type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
export type ReminderRuleRow = Database["public"]["Tables"]["reminder_rules"]["Row"];
export type EmailTemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];
export type ReminderLogRow = Database["public"]["Tables"]["reminder_logs"]["Row"];
export type FollowupTaskRow = Database["public"]["Tables"]["followup_tasks"]["Row"];
export type FollowupActivityRow = Database["public"]["Tables"]["followup_activities"]["Row"];
export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export type EffectiveStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(fromISO + "T00:00:00Z");
  const b = Date.parse(toISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

/** Overdue is derived: sent/partially_paid past due date. */
export function effectiveStatus(inv: {
  status: string;
  due_date: string;
}): EffectiveStatus {
  if (
    (inv.status === "sent" || inv.status === "partially_paid") &&
    inv.due_date < todayISO()
  ) {
    return "overdue";
  }
  return inv.status as EffectiveStatus;
}

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const STATUS_ORDER: EffectiveStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

export const STATUS_BADGE_CLASS: Record<EffectiveStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  sent: "bg-accent text-accent-foreground border-transparent",
  partially_paid: "bg-warning/15 text-warning border-transparent",
  paid: "bg-success/15 text-success border-transparent",
  overdue: "bg-destructive/15 text-destructive border-transparent",
  cancelled: "bg-muted text-muted-foreground line-through border-transparent",
};

export function formatMoney(amount: number | string | null | undefined, currency = "USD"): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compute line item totals; discount applies before tax. */
export function computeInvoiceTotals(input: {
  items: { quantity: number | string; unit_price: number | string; tax_rate: number | string }[];
  discount_type: string;
  discount_value: number | string;
  tax_rate: number | string;
}) {
  const subtotal = input.items.reduce(
    (sum, it) =>
      sum + Number(it.quantity || 0) * Number(it.unit_price || 0) * (1 + Number(it.tax_rate || 0) / 100),
    0,
  );
  const dv = Number(input.discount_value || 0);
  const discount =
    input.discount_type === "percentage"
      ? subtotal * Math.min(Math.max(dv, 0), 100) / 100
      : input.discount_type === "fixed"
        ? Math.min(dv, subtotal)
        : 0;
  const taxable = subtotal - discount;
  const tax = taxable * Number(input.tax_rate || 0) / 100;
  const total = taxable + tax;
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    total: round2(total),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function outstandingAmount(inv: InvoiceRow): number {
  return round2(Number(inv.total) - Number(inv.paid_amount));
}

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe (online)" },
  { value: "other", label: "Other" },
] as const;

export const CURRENCIES = [
  "USD", "EUR", "GBP", "SEK", "NOK", "DKK", "CHF", "CAD", "AUD", "INR", "JPY",
];
