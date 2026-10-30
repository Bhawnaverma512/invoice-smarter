import { supabase } from "@/integrations/supabase/client";
import { cancelScheduledReminders } from "@/lib/reminders";
import { round2 } from "@/lib/format";

interface RecordPaymentInput {
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

/** Record a payment and bring the invoice's paid amount and status in line with all of its payments. */
export async function recordPayment({ data }: { data: RecordPaymentInput }): Promise<void> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, business_id, total, currency, status")
    .eq("id", data.invoice_id)
    .single();
  if (invErr) throw invErr;
  if (inv.status === "cancelled") throw new Error("This invoice is cancelled");

  const { error: payErr } = await supabase.from("payments").insert({
    business_id: inv.business_id,
    invoice_id: inv.id,
    amount: data.amount,
    currency: inv.currency,
    payment_date: data.payment_date,
    method: data.method,
    reference: data.reference,
    notes: data.notes,
  });
  if (payErr) throw payErr;

  const { data: all, error: sumErr } = await supabase.from("payments").select("amount").eq("invoice_id", inv.id);
  if (sumErr) throw sumErr;
  const paid = round2((all ?? []).reduce((s, p) => s + Number(p.amount), 0));
  const status = paid >= Number(inv.total) ? "paid" : "partially_paid";

  const { error: updErr } = await supabase.from("invoices").update({ paid_amount: paid, status }).eq("id", inv.id);
  if (updErr) throw updErr;
  if (status === "paid") await cancelScheduledReminders(supabase, inv.id);
}
