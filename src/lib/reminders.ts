import { addDaysISO } from "@/lib/format";
import type { InvoiceRow, ReminderRuleRow } from "@/lib/format";

export interface PlannedReminder {
  rule_id: string;
  action: "send_email" | "create_task" | "flag_review";
  template_key: string;
  scheduled_at: string; // ISO timestamp
  trigger_type: string;
  offset_days: number;
}

/** Build the reminder schedule for one invoice from the business rules. */
export function planRemindersForInvoice(
  invoice: Pick<InvoiceRow, "id" | "due_date">,
  rules: ReminderRuleRow[],
): PlannedReminder[] {
  const due = invoice.due_date;
  return rules
    .filter((r) => r.enabled)
    .map((r) => {
      const date =
        r.trigger_type === "before_due"
          ? addDaysISO(due, -r.offset_days)
          : r.trigger_type === "on_due"
            ? due
            : addDaysISO(due, r.offset_days);
      return {
        rule_id: r.id,
        action: r.action,
        template_key: r.template_key ?? "manual_followup",
        scheduled_at: new Date(date + "T09:00:00Z").toISOString(),
        trigger_type: r.trigger_type,
        offset_days: r.offset_days,
      };
    });
}

type DbClient = {
  from: (table: string) => any;
};

/** Insert scheduled reminder logs, skipping rules that already have a log for this invoice. */
export async function scheduleRemindersForInvoice(
  db: DbClient,
  businessId: string,
  invoice: Pick<InvoiceRow, "id" | "due_date">,
  rules: ReminderRuleRow[],
): Promise<number> {
  const { data: existing } = await db
    .from("reminder_logs")
    .select("rule_id, status")
    .eq("invoice_id", invoice.id);
  const existingRuleIds = new Set(
    (existing ?? []).filter((l: { status: string }) => l.status !== "cancelled").map((l: { rule_id: string }) => l.rule_id),
  );
  const planned = planRemindersForInvoice(invoice, rules).filter((p) => !existingRuleIds.has(p.rule_id));
  if (planned.length === 0) return 0;
  const { error } = await db.from("reminder_logs").insert(
    planned.map((p) => ({
      business_id: businessId,
      invoice_id: invoice.id,
      rule_id: p.rule_id,
      template_key: p.template_key,
      channel: "email",
      scheduled_at: p.scheduled_at,
      status: "scheduled" as const,
    })),
  );
  if (error) throw error;
  return planned.length;
}

/** Stop all scheduled reminders (paid / cancelled invoices). */
export async function cancelScheduledReminders(db: DbClient, invoiceId: string): Promise<void> {
  await db.from("reminder_logs").update({ status: "cancelled" }).eq("invoice_id", invoiceId).eq("status", "scheduled");
}
