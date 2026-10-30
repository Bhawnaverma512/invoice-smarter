import { supabase } from "@/integrations/supabase/client";
import { scheduleRemindersForInvoice } from "@/lib/reminders";
import { cancelScheduledReminders } from "@/lib/reminders";
import {
  computeInvoiceTotals,
  formatDate,
  formatMoney,
  type BusinessRow,
  type InvoiceRow,
  type ReminderRuleRow,
} from "@/lib/format";

export type DiscountType = "none" | "percentage" | "fixed";

export interface LineInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceInput {
  customer_id: string;
  issue_date: string;
  due_date: string;
  currency: string;
  tax_rate: number;
  discount_type: DiscountType;
  discount_value: number;
  notes: string | null;
  payment_terms: number;
  items: LineInput[];
}

export function totalsFor(input: Pick<InvoiceInput, "items" | "tax_rate" | "discount_type" | "discount_value">) {
  return computeInvoiceTotals({
    items: input.items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price, tax_rate: 0 })),
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    tax_rate: input.tax_rate,
  });
}

/** Create or update an invoice (and replace its line items). Returns the invoice row. */
export async function saveInvoice(
  business: BusinessRow,
  input: InvoiceInput,
  opts: { id?: string; status?: InvoiceRow["status"] },
): Promise<InvoiceRow> {
  const items = input.items.filter((i) => i.description.trim() && i.quantity > 0);
  if (items.length === 0) throw new Error("Add at least one line item with a description and quantity");
  const t = totalsFor({ ...input, items });
  const fields = {
    customer_id: input.customer_id,
    issue_date: input.issue_date,
    due_date: input.due_date,
    currency: input.currency,
    tax_rate: input.tax_rate,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    notes: input.notes,
    payment_terms: input.payment_terms,
    payment_instructions: business.payment_instructions,
    subtotal: t.subtotal,
    total: t.total,
  };

  let invoice: InvoiceRow;
  if (opts.id) {
    const { data, error } = await supabase
      .from("invoices")
      .update({
        ...fields,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.status === "sent" ? { sent_at: new Date().toISOString() } : {}),
      })
      .eq("id", opts.id)
      .select("*")
      .single();
    if (error) throw error;
    invoice = data;
    const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", opts.id);
    if (delErr) throw delErr;
  } else {
    const { data: number, error: numErr } = await supabase.rpc("generate_invoice_number", { _business_id: business.id });
    if (numErr) throw numErr;
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        ...fields,
        business_id: business.id,
        invoice_number: number,
        status: opts.status ?? "draft",
        sent_at: opts.status === "sent" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    invoice = data;
  }

  const { error: itemErr } = await supabase.from("invoice_items").insert(
    items.map((i, position) => ({
      invoice_id: invoice.id,
      description: i.description.trim(),
      quantity: i.quantity,
      unit_price: i.unit_price,
      tax_rate: 0,
      position,
    })),
  );
  if (itemErr) throw itemErr;
  return invoice;
}

/** Mark an invoice as sent, schedule its reminders and log it. Returns how many reminders were scheduled. */
export async function markInvoiceSent(invoice: Pick<InvoiceRow, "id" | "due_date" | "status" | "business_id">): Promise<number> {
  if (invoice.status === "draft") {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoice.id);
    if (error) throw error;
  }
  const { data: rules } = await supabase
    .from("reminder_rules")
    .select("*")
    .eq("business_id", invoice.business_id);
  const count = await scheduleRemindersForInvoice(
    supabase,
    invoice.business_id,
    invoice,
    (rules ?? []) as ReminderRuleRow[],
  );
  await supabase.from("followup_activities").insert({
    business_id: invoice.business_id,
    invoice_id: invoice.id,
    type: "status_change",
    content: "Invoice sent to customer",
  });
  return count;
}

export async function deleteInvoice(invoice: Pick<InvoiceRow, "id" | "paid_amount">): Promise<void> {
  if (Number(invoice.paid_amount) > 0) {
    throw new Error("This invoice has recorded payments. Cancel it instead of deleting it.");
  }
  await cancelScheduledReminders(supabase, invoice.id);
  const { error: itemErr } = await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
  if (itemErr) throw itemErr;
  const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
  if (error) throw error;
}

export async function cancelInvoice(id: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await cancelScheduledReminders(supabase, id);
}

export function invoiceMailto(input: {
  to: string;
  customerName: string;
  number: string;
  amount: number;
  currency: string;
  dueDate: string;
  businessName: string;
  paymentInstructions?: string | null | undefined;
}) {
  const subject = `Invoice ${input.number} from ${input.businessName}`;
  const body =
    `Hi ${input.customerName},\n\n` +
    `Please find invoice ${input.number} for ${formatMoney(input.amount, input.currency)}, due on ${formatDate(input.dueDate)}.\n\n` +
    (input.paymentInstructions ? `Payment details:\n${input.paymentInstructions}\n\n` : "") +
    `Thank you,\n${input.businessName}`;
  return `mailto:${input.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
