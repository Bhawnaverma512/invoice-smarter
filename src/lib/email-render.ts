import { addDaysISO, formatDate, formatMoney, todayISO, daysBetween } from "@/lib/format";

export interface TemplateVars {
  customer_name: string;
  invoice_number: string;
  amount_due: string;
  due_date: string;
  payment_link: string;
  business_name: string;
  days_overdue: string;
}

export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = (vars as unknown as Record<string, string>)[key];
    return v === undefined ? `{{${key}}}` : v;
  });
}

export function buildTemplateVars(input: {
  customerName: string;
  invoiceNumber: string;
  amountDue: number;
  dueDate: string;
  businessName: string;
  currency: string;
  paymentLink?: string;
}): TemplateVars {
  const daysOverdue = daysBetween(input.dueDate, todayISO());
  return {
    customer_name: input.customerName,
    invoice_number: input.invoiceNumber,
    amount_due: formatMoney(input.amountDue, input.currency),
    due_date: formatDate(input.dueDate),
    payment_link: input.paymentLink ?? "{{payment_link}}",
    business_name: input.businessName,
    days_overdue: String(Math.max(daysOverdue, 0)),
  };
}
