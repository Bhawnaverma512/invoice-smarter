/** Built-in wording, used when a business hasn't saved its own template for a key. */
export const DEFAULT_TEMPLATES: Record<string, { label: string; subject: string; body: string }> = {
  new_invoice: {
    label: "New invoice email",
    subject: "Invoice {{invoice_number}} from {{business_name}}",
    body:
      "Hi {{customer_name}},\n\nThank you for your business. Please find invoice {{invoice_number}} for {{amount_due}}, due on {{due_date}}.\n\n" +
      "If you have any questions, just reply to this email.\n\nBest regards,\n{{business_name}}",
  },
  friendly_reminder: {
    label: "Friendly reminder (before due date)",
    subject: "Friendly reminder: invoice {{invoice_number}} is due {{due_date}}",
    body:
      "Hi {{customer_name}},\n\nJust a friendly reminder that invoice {{invoice_number}} for {{amount_due}} is due on {{due_date}}.\n\n" +
      "If you've already paid, thank you, and please ignore this message.\n\nBest regards,\n{{business_name}}",
  },
  due_today: {
    label: "Due today",
    subject: "Invoice {{invoice_number}} is due today",
    body:
      "Hi {{customer_name}},\n\nInvoice {{invoice_number}} for {{amount_due}} is due today ({{due_date}}).\n\n" +
      "Please let us know if you have any questions.\n\nThank you,\n{{business_name}}",
  },
  overdue_notice: {
    label: "Overdue payment",
    subject: "Invoice {{invoice_number}} is {{days_overdue}} day(s) overdue",
    body:
      "Hi {{customer_name}},\n\nOur records show that invoice {{invoice_number}} for {{amount_due}} was due on {{due_date}} and is now {{days_overdue}} day(s) overdue.\n\n" +
      "Could you please arrange payment, or let us know when we can expect it?\n\nThank you,\n{{business_name}}",
  },
  payment_confirmation: {
    label: "Payment confirmation",
    subject: "Payment received for invoice {{invoice_number}}",
    body:
      "Hi {{customer_name}},\n\nWe've received your payment for invoice {{invoice_number}}. Thank you!\n\n" +
      "Please keep this email as your confirmation.\n\nBest regards,\n{{business_name}}",
  },
  thank_you: {
    label: "Thank you email",
    subject: "Thank you from {{business_name}}",
    body:
      "Hi {{customer_name}},\n\nThank you for your prompt payment and for choosing {{business_name}}. We really appreciate your business and look forward to working with you again.\n\n" +
      "Warm regards,\n{{business_name}}",
  },
  manual_followup: {
    label: "General follow-up",
    subject: "Following up on invoice {{invoice_number}}",
    body:
      "Hi {{customer_name}},\n\nI'm following up on invoice {{invoice_number}} ({{amount_due}} outstanding, due {{due_date}}).\n\n" +
      "Please let me know if there's anything we can help with.\n\nBest regards,\n{{business_name}}",
  },
};
